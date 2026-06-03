import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
// The service account key should be set via environment variable FIREBASE_SERVICE_ACCOUNT_KEY
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccountKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  projectId: serviceAccountKey.project_id,
});

export const db = admin.firestore();
export const auth = admin.auth();

console.log('✅ Firebase initialized successfully');

export default admin;
