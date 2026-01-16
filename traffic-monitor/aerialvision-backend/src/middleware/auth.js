const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');
const { sendUnauthorized, sendError } = require('../utils/responses');
const { logger } = require('../utils/logger');

/**
 * Verify Firebase JWT token and extract user info
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return sendUnauthorized(res, 'Access token required');
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Fetch additional user data from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return sendUnauthorized(res, 'User not found in system');
    }

    const userData = userDoc.data();
    
    // Check if user is active
    if (userData.status !== 'ACTIVE') {
      return sendUnauthorized(res, 'Account suspended or inactive');
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      name: userData.name,
      status: userData.status,
      accessLevel: userData.accessLevel || 1
    };

    logger.debug('User authenticated:', { 
      uid: req.user.uid, 
      role: req.user.role,
      email: req.user.email 
    });

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return sendUnauthorized(res, 'Token expired');
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return sendUnauthorized(res, 'Invalid token');
    }
    
    return sendError(res, 'Authentication error', 401);
  }
};

module.exports = { authenticateToken };
