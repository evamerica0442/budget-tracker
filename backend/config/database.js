/**
 * MongoDB / Mongoose Connection
 * ==============================
 *
 * Connects to MongoDB for storing scheduled payments, reconciliation data,
 * and reminder configurations.
 *
 * This is a secondary database alongside Firestore (which handles
 * transactions, categories, envelopes, and savings goals).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-tracker';

let isConnected = false;

/**
 * Connect to MongoDB with retry logic.
 * @param {Object} [options]
 * @param {number} [options.retries=3]
 * @param {number} [options.retryDelayMs=5000]
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase(options = {}) {
  const { retries = 3, retryDelayMs = 5000 } = options;

  if (isConnected) {
    console.log('✅ MongoDB already connected');
    return mongoose;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        // Mongoose 7+ defaults are good; these are explicit for clarity
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      isConnected = true;
      console.log(`✅ MongoDB connected: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      return mongoose;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);

      if (attempt < retries) {
        console.log(`⏳ Retrying in ${retryDelayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        console.error('❌ All MongoDB connection attempts failed');
        throw err;
      }
    }
  }
}

/**
 * Disconnect from MongoDB (graceful shutdown).
 */
export async function disconnectDatabase() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('✅ MongoDB disconnected');
}

/**
 * Check connection status.
 * @returns {boolean}
 */
export function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default { connectDatabase, disconnectDatabase, isDatabaseConnected };