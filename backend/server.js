import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/firebase.js'; // Initialize Firebase
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Log startup info
console.log('🚀 Starting Budget Tracker Backend...');
console.log('📍 PORT:', PORT);
console.log('🌍 CORS_ORIGIN:', process.env.CORS_ORIGIN || 'Not set (will use default)');
console.log('🔑 Firebase Key Set:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'Yes' : 'No');

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  console.warn(`404 - ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Diagnostics: http://localhost:${PORT}/api/diagnostics`);
});

// Handle uncaught errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

export default app;
