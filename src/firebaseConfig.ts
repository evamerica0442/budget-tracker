import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Use REACT_APP_ prefix for variables to be recognized by react-scripts
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCez7rNVUhSgGOaVayIOf3UTSY2ljqw9Dw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "budget-tracker-app-a5ee9.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "budget-tracker-app-a5ee9",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "budget-tracker-app-a5ee9.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "388917531008",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:388917531008:web:993dc4a3f72d886a6b3165",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-6097W0SCQ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services for use in your components/Contexts
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;