import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Get all savings goals
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .orderBy('deadline')
      .get();
    
    const goals = [];
    snapshot.forEach(doc => {
      goals.push({ id: doc.id, ...doc.data() });
    });

    res.json(goals);
  } catch (err) {
    next(err);
  }
});

// Get single savings goal
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// Create savings goal
router.post('/', async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, deadline, color } = req.body;

    if (!name || targetAmount === undefined || !deadline) {
      return res.status(400).json({ error: 'Missing required fields: name, targetAmount, deadline' });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({ error: 'Target amount must be positive' });
    }

    const goal = {
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount !== undefined ? Number(currentAmount) : 0,
      deadline: deadline,
      color: color || '#2ecc71',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .add(goal);

    res.status(201).json({ id: docRef.id, ...goal });
  } catch (err) {
    next(err);
  }
});

// Update savings goal
router.put('/:id', async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, deadline, color } = req.body;

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (targetAmount !== undefined) updateData.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined) updateData.currentAmount = Number(currentAmount);
    if (deadline !== undefined) updateData.deadline = deadline;
    if (color !== undefined) updateData.color = color;
    updateData.updatedAt = new Date().toISOString();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Delete savings goal
router.delete('/:id', async (req, res, next) => {
  try {
    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    await docRef.delete();
    res.json({ message: 'Savings goal deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// Contribute / Earmark funds to savings goal
router.post('/:id/contribute', async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Contribution amount must be positive' });
    }

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('savingsGoals')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const goal = doc.data();
    const newAmount = (goal.currentAmount || 0) + Number(amount);

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

export default router;
