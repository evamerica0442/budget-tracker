import { auth } from '../config/firebase.js';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided in Authorization header');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔐 Attempting to verify ID token...');
    const decodedToken = await auth.verifyIdToken(token);
    console.log('✅ ID token verified for user:', decodedToken.uid);

    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email || decodedToken.claims?.email;
    console.log('👤 Auth middleware: User ID =', req.userId);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    const isCustomToken = error.message.includes('expects an ID token, but was given a custom token');
    res.status(401).json({ 
      error: isCustomToken ? 'Sent Custom Token instead of ID Token' : 'Authentication failed',
      details: isCustomToken ? 'The frontend must sign in with the custom token via the Firebase Client SDK to retrieve a valid ID Token.' : error.message
    });
  }
};

export default authMiddleware;