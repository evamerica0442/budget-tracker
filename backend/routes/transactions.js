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
    const userId = req.userId;

    console.log('📝 Creating transaction for user:', userId);
    console.log('📦 Transaction data:', { type, amount, description, category, date });

    if (!type || !amount || !description || !category) {
      console.warn('❌ Validation error: Missing fields', { type, amount, description, category });
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

    console.log('💾 Saving to Firestore...');
    const docRef = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .add(transaction);

    console.log('✅ Transaction saved successfully with ID:', docRef.id);
    res.status(201).json({ id: docRef.id, ...transaction });
  } catch (err) {
    console.error('❌ Error creating transaction:', err);
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

// Duplicate transactions from one month to another
router.post('/duplicate', async (req, res, next) => {
  try {
    const { sourceYear, sourceMonth, targetYear, targetMonth } = req.body;

    if (sourceYear === undefined || sourceMonth === undefined || targetYear === undefined || targetMonth === undefined) {
      return res.status(400).json({ error: 'Missing required fields: sourceYear, sourceMonth, targetYear, targetMonth' });
    }

    // Calculate date range for source month
    const sourceStart = new Date(sourceYear, sourceMonth - 1, 1);
    const sourceEnd = new Date(sourceYear, sourceMonth, 0, 23, 59, 59);

    // Fetch transactions from source month
    const snapshot = await db
      .collection('users')
      .doc(req.userId)
      .collection('transactions')
      .where('date', '>=', sourceStart.toISOString())
      .where('date', '<=', sourceEnd.toISOString())
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No transactions found in the source month', count: 0 });
    }

    // Create batch to write all duplicated transactions
    const batch = db.batch();
    const userTransactionsRef = db.collection('users').doc(req.userId).collection('transactions');

    const duplicated = [];
    snapshot.forEach(doc => {
      const data = doc.data();

      // Calculate the day of month from original date
      const originalDate = new Date(data.date);
      const day = originalDate.getDate();

      // Create new date in target month (clamp to last day of target month if needed)
      const targetDate = new Date(targetYear, targetMonth - 1, 1);
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
      targetDate.setDate(Math.min(day, lastDayOfTargetMonth));

      const newDocRef = userTransactionsRef.doc();
      batch.set(newDocRef, {
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: targetDate.toISOString(),
        createdAt: new Date().toISOString()
      });

      duplicated.push({
        id: newDocRef.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: targetDate.toISOString()
      });
    });

    await batch.commit();

    res.status(201).json({
      message: `Duplicated ${duplicated.length} transactions from ${sourceYear}-${sourceMonth} to ${targetYear}-${targetMonth}`,
      count: duplicated.length,
      transactions: duplicated
    });
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
