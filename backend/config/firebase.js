import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
// The service account key should be set via environment variable FIREBASE_SERVICE_ACCOUNT_KEY
let serviceAccountKey = null;

try {
  const keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!keyString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  serviceAccountKey = JSON.parse(keyString);
  console.log('✅ Service account key parsed successfully');
} catch (parseError) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
  console.error('Make sure the entire JSON is properly set as a single environment variable');
  // Don't exit, let the server start anyway - it will error on Firebase operations
  serviceAccountKey = null;
}

if (serviceAccountKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });
    console.log('✅ Firebase initialized successfully with project:', serviceAccountKey.project_id);
  } catch (initError) {
    console.error('❌ Failed to initialize Firebase:', initError.message);
  }
} else {
  console.warn('⚠️  Firebase not initialized - operations will fail');
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;
