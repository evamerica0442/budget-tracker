import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Get all envelopes
router.get('/', async (req, res, next) => {
  try {
    const { period } = req.query;

    let query = db.collection('users').doc(req.userId).collection('envelopes');

    if (period) {
      query = query.where('period', '==', period);
    }

    const snapshot = await query.orderBy('name').get();
    
    const envelopes = [];
    snapshot.forEach(doc => {
      envelopes.push({ id: doc.id, ...doc.data() });
    });

    res.json(envelopes);
  } catch (err) {
    next(err);
  }
});

// Get single envelope
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// Create envelope
router.post('/', async (req, res, next) => {
  try {
    const { name, budgetAmount, currentAmount, category, color, period, startDate, endDate, autoRefill } = req.body;

    if (!name || budgetAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name and budgetAmount' });
    }

    if (budgetAmount < 0) {
      return res.status(400).json({ error: 'Budget amount must be non-negative' });
    }

    const envelope = {
      name: name.trim(),
      budgetAmount: Number(budgetAmount),
      currentAmount: currentAmount !== undefined ? Number(currentAmount) : Number(budgetAmount),
      category: category || null,
      color: color || '#3498db',
      period: period || 'monthly',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      autoRefill: autoRefill !== undefined ? autoRefill : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .add(envelope);

    res.status(201).json({ id: docRef.id, ...envelope });
  } catch (err) {
    next(err);
  }
});

// Update envelope
router.put('/:id', async (req, res, next) => {
  try {
    const { name, budgetAmount, currentAmount, category, color, period, startDate, endDate, autoRefill } = req.body;

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (budgetAmount !== undefined) updateData.budgetAmount = Number(budgetAmount);
    if (currentAmount !== undefined) updateData.currentAmount = Number(currentAmount);
    if (category !== undefined) updateData.category = category;
    if (color !== undefined) updateData.color = color;
    if (period !== undefined) updateData.period = period;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (autoRefill !== undefined) updateData.autoRefill = autoRefill;
    updateData.updatedAt = new Date().toISOString();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Delete envelope
router.delete('/:id', async (req, res, next) => {
  try {
    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    await docRef.delete();
    res.json({ message: 'Envelope deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// Add funds to envelope
router.post('/:id/add-funds', async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const envelope = doc.data();
    const newAmount = (envelope.currentAmount || 0) + Number(amount);

    await docRef.update({
      currentAmount: newAmount,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Spend from envelope
router.post('/:id/spend', async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const envelope = doc.data();
    const newAmount = Math.max(0, (envelope.currentAmount || 0) - Number(amount));

    await docRef.update({
      currentAmount: newAmount,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Refill envelope to budget amount
router.post('/:id/refill', async (req, res, next) => {
  try {
    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('envelopes')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const envelope = doc.data();

    await docRef.update({
      currentAmount: envelope.budgetAmount,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

export default router;
