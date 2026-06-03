import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;

    let query = db.collection('users').doc(req.userId).collection('categories');

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.orderBy('type').orderBy('displayName').get();
    
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Get single category
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await db
      .collection('users')
      .doc(req.userId)
      .collection('categories')
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// Create category
router.post('/', async (req, res, next) => {
  try {
    const { name, displayName, type, color } = req.body;

    if (!name || !displayName || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const category = {
      name: name.toLowerCase().trim(),
      displayName,
      type,
      color: color || '#3498db',
      createdAt: new Date().toISOString()
    };

    const docRef = await db
      .collection('users')
      .doc(req.userId)
      .collection('categories')
      .add(category);

    res.status(201).json({ id: docRef.id, ...category });
  } catch (err) {
    next(err);
  }
});

// Update category
router.put('/:id', async (req, res, next) => {
  try {
    const { name, displayName, type, color } = req.body;

    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('categories')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updateData = {};
    if (name) updateData.name = name.toLowerCase().trim();
    if (displayName) updateData.displayName = displayName;
    if (type) updateData.type = type;
    if (color) updateData.color = color;
    updateData.updatedAt = new Date().toISOString();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    next(err);
  }
});

// Delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const docRef = db
      .collection('users')
      .doc(req.userId)
      .collection('categories')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await docRef.delete();
    res.json({ message: 'Category deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// Bulk create categories (useful for seeding default categories)
router.post('/bulk/seed', async (req, res, next) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Expected array of categories' });
    }

    // Check if categories already exist
    const snapshot = await db
      .collection('users')
      .doc(req.userId)
      .collection('categories')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Categories already exist. Use POST / to add individual categories.' });
    }

    const batch = db.batch();
    const userCategoriesRef = db.collection('users').doc(req.userId).collection('categories');

    const created = [];
    for (const category of categories) {
      const docRef = userCategoriesRef.doc();
      batch.set(docRef, {
        ...category,
        createdAt: new Date().toISOString()
      });
      created.push({ id: docRef.id, ...category });
    }

    await batch.commit();
    res.status(201).json({ created: created.length, categories: created });
  } catch (err) {
    next(err);
  }
});

export default router;
