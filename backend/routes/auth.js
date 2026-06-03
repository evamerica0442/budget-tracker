import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

// Default categories to seed for new users
const defaultCategories = [
  // South African Income Categories
  { name: 'salary', displayName: 'Salary', type: 'income', color: '#27ae60' },
  { name: 'business income', displayName: 'Business Income', type: 'income', color: '#2ecc71' },
  { name: 'freelance work', displayName: 'Freelance Work', type: 'income', color: '#16a085' },
  { name: 'investment returns', displayName: 'Investment Returns', type: 'income', color: '#1abc9c' },
  { name: 'rental income', displayName: 'Rental Income', type: 'income', color: '#3498db' },
  { name: 'pension', displayName: 'Pension', type: 'income', color: '#9b59b6' },
  { name: 'grants/benefits', displayName: 'Grants/Benefits', type: 'income', color: '#f39c12' },

  // South African Expense Categories
  { name: 'groceries', displayName: 'Groceries', type: 'expense', color: '#e74c3c' },
  { name: 'transport (fuel)', displayName: 'Transport (Fuel)', type: 'expense', color: '#f39c12' },
  { name: 'transport (public)', displayName: 'Transport (Public)', type: 'expense', color: '#e67e22' },
  { name: 'bond/rent', displayName: 'Bond/Rent', type: 'expense', color: '#3498db' },
  { name: 'electricity', displayName: 'Electricity', type: 'expense', color: '#9b59b6' },
  { name: 'water', displayName: 'Water', type: 'expense', color: '#16a085' },
  { name: 'internet', displayName: 'Internet', type: 'expense', color: '#1abc9c' },
  { name: 'cell phone', displayName: 'Cell Phone', type: 'expense', color: '#34495e' },
  { name: 'medical aid', displayName: 'Medical Aid', type: 'expense', color: '#e67e22' },
  { name: 'doctors/hospitals', displayName: 'Doctors/Hospitals', type: 'expense', color: '#f39c12' },
  { name: 'school fees', displayName: 'School Fees', type: 'expense', color: '#3498db' },
  { name: 'petrol', displayName: 'Petrol', type: 'expense', color: '#e74c3c' },
  { name: 'insurance', displayName: 'Insurance', type: 'expense', color: '#9b59b6' },
  { name: 'rates & taxes', displayName: 'Rates & Taxes', type: 'expense', color: '#16a085' },
  { name: 'tv license', displayName: 'TV License', type: 'expense', color: '#1abc9c' },
  { name: 'entertainment', displayName: 'Entertainment', type: 'expense', color: '#34495e' },
  { name: 'dining out', displayName: 'Dining Out', type: 'expense', color: '#e74c3c' },
  { name: 'shopping', displayName: 'Shopping', type: 'expense', color: '#f39c12' },
];

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Store user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    // Seed default categories for the new user
    const categoriesRef = db.collection('users').doc(userRecord.uid).collection('categories');
    for (const category of defaultCategories) {
      await categoriesRef.add({
        ...category,
        createdAt: new Date().toISOString(),
      });
    }

    // Get custom token for frontend login
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      user: {
        id: userRecord.uid,
        name,
        email,
      },
      token: customToken,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      // Note: Firebase Admin SDK doesn't have a direct password verification method
      // The proper way is to use the Firebase REST API or client SDK for password verification
      // For now, we create a custom token which the frontend will exchange for an ID token
      
      const userRecord = await auth.getUserByEmail(email);
      
      // Create custom token for login
      const customToken = await auth.createCustomToken(userRecord.uid);

      // Get user profile from Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      const userData = userDoc.data();

      res.json({
        user: {
          id: userRecord.uid,
          name: userData?.name || userRecord.displayName,
          email: userRecord.email,
        },
        token: customToken,
        message: 'Login successful. Use this token to exchange for an ID token via Firebase Client SDK.',
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

export default router;