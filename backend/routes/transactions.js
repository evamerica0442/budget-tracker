import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Get all transactions
router.get('/', async (req, res, next) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    
    let query = db.collection('users').doc(req.userId).collection('transactions');

    if (type) {
      query = query.where('type', '==', type);
    }

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.orderBy('date', 'desc').get();
    
    let transactions = [];
    snapshot.forEach(doc => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      transactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= start && txDate <= end;
      });
    }

    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Get transactions summary for a month
router.get('/summary/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const snapshot = await db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .where('date', '>=', startDate.toISOString())
      .where('date', '<=', endDate.toISOString())
      .get();

    let income = 0;
    let expenses = 0;
    snapshot.forEach(doc => {
      const transaction = doc.data();
      if (transaction.type === 'income') {
        income += transaction.amount;
      } else if (transaction.type === 'expense') {
        expenses += transaction.amount;
      }
    });

    res.json({
      month,
      year,
      income,
      expenses,
      balance: income - expenses,
      transactionCount: snapshot.size
    });
  } catch (err) {
    next(err);
  }
});

// Get single transaction
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// Create transaction
router.post('/', async (req, res, next) => {
  try {
    const { type, amount, description, category, date } = req.body;

    if (!type || !amount || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = {
      type,
      amount: parseFloat(amount),
      description,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const docRef = await db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .add(transaction);

    res.status(201).json({ id: docRef.id, ...transaction });
  } catch (err) {
    next(err);
  }
});

// Update transaction
router.put('/:id', async (req, res, next) => {
  try {
    const { type, amount, description, category, date } = req.body;

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updateData = {};
    if (type) updateData.type = type;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (date) updateData.date = new Date(date).toISOString();
    updateData.updatedAt = new Date().toISOString();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Delete transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await docRef.delete();
    res.json({ message: 'Transaction deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// Bulk create transactions
router.post('/bulk/import', async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Expected array of transactions' });
    }

    const batch = db.batch();
    const userTransactionsRef = db.collection('users').doc(req.userId).collection('transactions');

    const created = [];
    for (const transaction of transactions) {
      const docRef = userTransactionsRef.doc();
      batch.set(docRef, {
        ...transaction,
        date: transaction.date ? new Date(transaction.date).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      created.push({ id: docRef.id, ...transaction });
    }

    await batch.commit();
    res.status(201).json({ created: created.length, transactions: created });
  } catch (err) {
    next(err);
  }
});

export default router;
