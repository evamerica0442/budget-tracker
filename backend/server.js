import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import './config/firebase.js'; // Initialize Firebase
import { connectDatabase } from './config/database.js';
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import authRoutes from './routes/auth.js';
import envelopeRoutes from './routes/envelopes.js';
import savingsGoalRoutes from './routes/savingsGoals.js';
import aiRoutes from './routes/ai.js';
import scheduledPaymentRoutes from './routes/scheduled-payments.js';
import { errorHandler } from './middleware/errorHandler.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Dockerfile copies frontend build to /app/public
const buildPath = path.join(__dirname, '..', 'public');
const PORT = 5000; // Hardcode to 5000 so Nginx can use 10000

// Log startup info
console.log('🚀 Starting Budget Tracker Backend...');
console.log('📍 PORT:', PORT);
console.log('🌍 CORS_ORIGIN:', process.env.CORS_ORIGIN || 'Not set (will use default)');
console.log('🔑 Firebase Key Set:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'Yes' : 'No');
console.log('📂 Build Path:', buildPath);

if (fs.existsSync(buildPath)) {
  console.log('✅ Build directory found');
} else {
  console.error('❌ Build directory NOT found at:', buildPath);
}

// Middleware
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`📡 ${req.method} ${req.url}`);
    if (['POST', 'PUT'].includes(req.method)) {
      console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
});

// Add this helper to check Firebase status
app.get('/api/debug-firebase', (req, res) => {
  res.json({
    initialized: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    dbAvailable: !!transactionRoutes,
    env: process.env.NODE_ENV
  });
});

app.use(cors({
  origin: true, // Reflects the request origin, safer for debugging same-domain proxying
  credentials: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Budget Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// Diagnostics endpoint - NO AUTH REQUIRED
app.get('/api/diagnostics', (req, res) => {
  res.json({
    status: 'Server running',
    port: PORT,
    corsOrigin: process.env.CORS_ORIGIN || 'Not set',
    nodeEnv: process.env.NODE_ENV || 'Not set',
    firebaseKeySet: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', auth, transactionRoutes);
app.use('/api/categories', auth, categoryRoutes);
app.use('/api/envelopes', auth, envelopeRoutes);
app.use('/api/savings-goals', auth, savingsGoalRoutes);
app.use('/api/ai', auth, aiRoutes);
app.use('/api/scheduled-payments', auth, scheduledPaymentRoutes);

// Serve static files from the React app build folder
app.use(express.static(buildPath));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(buildPath, 'index.html');
  res.sendFile(indexPath);
});

// 404 handler
app.use((req, res) => {
  console.warn(`404 - ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// Error handling middleware - MUST BE LAST
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Diagnostics: http://localhost:${PORT}/api/diagnostics`);

  // Connect to MongoDB for scheduled payments
  try {
    await connectDatabase();
  } catch (err) {
    console.warn('⚠️  MongoDB not available — scheduled payments will be unavailable');
  }
});

// Handle uncaught errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

export default app;
