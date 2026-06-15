/**
 * Scheduled Payments API Routes
 * ==============================
 *
 * CRUD + reconciliation + reminder endpoints for scheduled payments.
 *
 * Endpoints:
 *   GET    /api/scheduled-payments          — List all (with optional status filter)
 *   GET    /api/scheduled-payments/:id      — Get single payment
 *   POST   /api/scheduled-payments          — Create new scheduled payment
 *   PUT    /api/scheduled-payments/:id      — Update existing payment
 *   DELETE /api/scheduled-payments/:id      — Delete (soft: sets status=archived)
 *   POST   /api/scheduled-payments/:id/reconcile     — Manual reconcile with a transaction
 *   POST   /api/scheduled-payments/reminders/process — Trigger reminder processing
 */

import express from 'express';
import mongoose from 'mongoose';
import ScheduledPayment from '../models/ScheduledPayment.js';
import { reconcileTransactions, manualReconcile } from '../services/reconciliation-engine.js';
import { processReminders, triggerManualReminder } from '../services/reminder-service.js';
import { parseCSV, detectBank } from '../services/csv-parser.js';
import { db } from '../config/firebase.js';

const router = express.Router();

// ── Middleware: Check MongoDB Availability ──────────────────────────────
// Render doesn't provide MongoDB, so the app degrades gracefully with a
// clear error message telling the user to set up MongoDB Atlas.
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Scheduled payments are unavailable',
      message: 'MongoDB is not connected. To use scheduled payments, reminders, and reconciliation:', 
      steps: [
        '1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/atlas',
        '2. Get your connection string (MongoDB -> Connect -> Drivers)',
        '3. Add MONGODB_URI to your Render environment variables',
        '4. Redeploy the service'
      ],
      docs: 'https://www.mongodb.com/docs/atlas/getting-started/'
    });
  }
  next();
});

// ── User Context Helper ────────────────────────────────────────────────────

/**
 * Build a user-lookup context for services.
 * In production, this would query the Users collection.
 */
function buildUserContext(req) {
  return {
    getUser: async (userId) => {
      // Fetch user from Firestore
      const doc = await db.collection('users').doc(userId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        email: data.email,
        name: data.name || data.email?.split('@')[0],
        phone: data.phone,
        fcmToken: data.fcmToken,
      };
    },
  };
}

// ── CRUD: List ─────────────────────────────────────────────────────────────

/**
 * GET /api/scheduled-payments
 * Query params:
 *   ?status=active|paused|completed|cancelled|archived
 *   ?upcoming=true  — Only payments due within the next N days
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const filter = { user: req.userId };

    if (status) {
      filter.status = status;
    }

    if (upcoming === 'true') {
      const lookahead = parseInt(req.query.days) || 30;
      const now = new Date();
      const end = new Date(now.getTime() + lookahead * 24 * 60 * 60 * 1000);
      filter.due_date = { $gte: now, $lte: end };
      filter.status = { $in: ['active', 'paused'] };
    }

    const payments = await ScheduledPayment.find(filter)
      .sort({ due_date: 1 })
      .lean();

    res.json(payments);
  } catch (err) {
    next(err);
  }
});

// ── CRUD: Get Single ───────────────────────────────────────────────────────

/**
 * GET /api/scheduled-payments/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await ScheduledPayment.findOne({
      id: req.params.id,
      user: req.userId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }

    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// ── CRUD: Create ───────────────────────────────────────────────────────────

/**
 * POST /api/scheduled-payments
 * Body: { name, amount, frequency, due_date, category, ...optional }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, amount, frequency, due_date, category } = req.body;

    if (!name || amount === undefined || !frequency || !due_date || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'amount', 'frequency', 'due_date', 'category'],
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const paymentData = {
      name,
      amount: parseFloat(amount),
      currency: req.body.currency || 'ZAR',
      frequency,
      due_date: new Date(due_date),
      end_date: req.body.end_date ? new Date(req.body.end_date) : null,
      category,
      linked_account: req.body.linked_account || '',
      status: req.body.status || 'active',
      reminders: {
        days_before: req.body.reminders?.days_before || [7, 3, 1],
        channels: req.body.reminders?.channels || ['email'],
        missed_alert: req.body.reminders?.missed_alert !== false,
      },
      reconciliation: {
        match_strategy: req.body.reconciliation?.match_strategy || 'description_and_amount',
        match_text: req.body.reconciliation?.match_text || '',
        amount_tolerance: req.body.reconciliation?.amount_tolerance || 0,
        reconciled_transaction_ids: [],
        last_reconciled_date: null,
      },
      personal_data_consent_at: new Date(),
      user: req.userId,
    };

    const payment = new ScheduledPayment(paymentData);
    await payment.save();

    console.log(`[scheduled-payments] Created: ${payment.id} — ${name}`);
    res.status(201).json(payment);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    next(err);
  }
});

// ── CRUD: Update ───────────────────────────────────────────────────────────

/**
 * PUT /api/scheduled-payments/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name', 'amount', 'currency', 'frequency', 'due_date', 'end_date',
      'category', 'linked_account', 'status', 'reminders', 'reconciliation',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Convert dates if present
    if (updateData.due_date) updateData.due_date = new Date(updateData.due_date);
    if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

    const payment = await ScheduledPayment.findOneAndUpdate(
      { id, user: req.userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }

    res.json(payment);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    next(err);
  }
});

// ── CRUD: Delete (soft) ────────────────────────────────────────────────────

/**
 * DELETE /api/scheduled-payments/:id
 * Soft-delete by setting status to 'archived'.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const payment = await ScheduledPayment.findOneAndUpdate(
      { id: req.params.id, user: req.userId },
      { $set: { status: 'archived' } },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }

    res.json({ message: 'Payment archived', id: payment.id });
  } catch (err) {
    next(err);
  }
});

// ── Reconciliation: Auto-reconcile via CSV import ──────────────────────────

/**
 * POST /api/scheduled-payments/import/csv
 * Body: { bank: string, csvData: string }
 * Parses CSV, normalizes, reconciles against scheduled payments, saves transactions.
 */
router.post('/import/csv', async (req, res, next) => {
  try {
    const { bank, csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    // Detect bank if not specified
    const detectedBank = bank || detectBank(csvData);
    if (!detectedBank) {
      return res.status(400).json({
        error: 'Could not detect bank. Please specify one.',
        supported: ['fnb', 'absa', 'capitec', 'nedbank', 'standardbank'],
      });
    }

    // Parse CSV into normalized transactions
    const transactions = parseCSV(csvData, detectedBank);

    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions found in CSV' });
    }

    // Store transactions in Firestore
    const batch = db.batch();
    const userTransactionsRef = db
      .collection('users')
      .doc(req.userId)
      .collection('transactions');

    const savedTransactions = [];
    for (const tx of transactions) {
      const docRef = userTransactionsRef.doc();
      batch.set(docRef, {
        type: tx.amount < 0 ? 'expense' : 'income',
        amount: Math.abs(tx.amount),
        description: tx.merchant,
        category: tx.category,
        date: tx.date,
        source: tx.source,
        createdAt: new Date().toISOString(),
      });
      savedTransactions.push({ id: docRef.id, ...tx });
    }
    await batch.commit();

    // Reconcile against scheduled payments
    const reconciliationResult = await reconcileTransactions(
      req.userId,
      savedTransactions,
      { dateWindowDays: 5 }
    );

    res.status(201).json({
      imported: savedTransactions.length,
      bank: detectedBank,
      transactions: savedTransactions,
      reconciliation: reconciliationResult,
    });
  } catch (err) {
    next(err);
  }
});

// ── Reconciliation: Manual reconcile ───────────────────────────────────────

/**
 * POST /api/scheduled-payments/:id/reconcile
 * Body: { transactionId: string }
 * Manually marks a scheduled payment as paid by a specific transaction.
 */
router.post('/:id/reconcile', async (req, res, next) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required' });
    }

    const result = await manualReconcile(req.params.id, transactionId);

    // Verify ownership
    const payment = await ScheduledPayment.findOne({
      id: req.params.id,
      user: req.userId,
    });
    if (!payment) {
      return res.status(403).json({ error: 'Payment not found or access denied' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Reminders: Trigger processing ─────────────────────────────────────────

/**
 * POST /api/scheduled-payments/reminders/process
 *
 * Triggers the reminder engine. Can be called by:
 *   - A cron job (node-cron, Cloud Scheduler)
 *   - The UI (admin button)
 *   - POST /api/scheduled-payments/:id/remind — Send reminder for one payment
 */
router.post('/reminders/process', async (req, res, next) => {
  try {
    const ctx = buildUserContext(req);
    const result = await processReminders(ctx);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/scheduled-payments/:id/remind
 * Manually trigger a reminder for a specific payment.
 */
router.post('/:id/remind', async (req, res, next) => {
  try {
    const ctx = buildUserContext(req);
    const result = await triggerManualReminder(req.params.id, ctx);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Reconciliation report ──────────────────────────────────────────────────

/**
 * GET /api/scheduled-payments/reconciliation/summary
 * Returns a summary of reconciliation status for all active payments.
 */
router.get('/reconciliation/summary', async (req, res, next) => {
  try {
    const payments = await ScheduledPayment.find({
      user: req.userId,
      status: { $in: ['active', 'paused'] },
    }).lean();

    const summary = payments.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      frequency: p.frequency,
      dueDate: p.due_date,
      status: p.status,
      daysUntilDue: Math.ceil(
        (new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      reconciled: p.reconciliation?.reconciled_transaction_ids?.length || 0,
      lastReconciled: p.reconciliation?.last_reconciled_date || null,
      isOverdue: new Date(p.due_date) < new Date(),
    }));

    res.json({
      total: summary.length,
      overdue: summary.filter((s) => s.isOverdue).length,
      reconciled: summary.filter((s) => s.reconciled > 0).length,
      payments: summary,
    });
  } catch (err) {
    next(err);
  }
});

export default router;