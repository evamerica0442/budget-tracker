import { auth } from '../config/firebase.js';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided in Authorization header');
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decodedToken;
    
    try {
      // Try to verify as ID token first
      console.log('🔐 Attempting to verify as ID token...');
      decodedToken = await auth.verifyIdToken(token);
      console.log('✅ ID token verified for user:', decodedToken.uid);
    } catch (idTokenError) {
      // If ID token fails, try to verify as custom token
      console.log('🔄 ID token verification failed, trying custom token...');
      try {
        decodedToken = await auth.verifyCustomToken(token);
        console.log('✅ Custom token verified for user:', decodedToken.uid);
      } catch (customTokenError) {
        console.error('❌ Token verification failed - ID token:', idTokenError.message, '- Custom token:', customTokenError.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email || decodedToken.claims?.email;
    console.log('👤 Auth middleware: User ID =', req.userId);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export default authMiddleware;