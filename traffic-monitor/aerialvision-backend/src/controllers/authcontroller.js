const { admin, db } = require('../config/firebase');
const { sendSuccess, sendError, sendValidationError } = require('../utils/responses');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Login - Verify Firebase token and return user data
 */
const login = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendValidationError(res, [{ field: 'idToken', message: 'ID token is required' }]);
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return sendError(res, 'User not found in system', 404);
    }

    const userData = userDoc.data();

    // Check if user is active
    if (userData.status !== 'ACTIVE') {
      return sendError(res, 'Account suspended or deactivated', 403);
    }

    // Update last login timestamp
    await db.collection('users').doc(decodedToken.uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginIP: req.ip
    });

    // Log successful login
    await db.collection('auditLogs').add({
      action: 'USER_LOGIN',
      userId: decodedToken.uid,
      userEmail: decodedToken.email,
      userRole: userData.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'SUCCESS'
    });

    logger.info('User logged in successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role
    });

    // Return user data (without sensitive info)
    const responseData = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userData.name,
      role: userData.role,
      accessLevel: userData.accessLevel,
      status: userData.status,
      lastLogin: userData.lastLogin,
      permissions: userData.permissions || []
    };

    return sendSuccess(res, responseData, 'Login successful');

  } catch (error) {
    logger.error('Login failed:', error);

    // Log failed attempt
    await db.collection('auditLogs').add({
      action: 'FAILED_LOGIN',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'CRITICAL'
    });

    if (error.code === 'auth/id-token-expired') {
      return sendError(res, 'Token expired', 401);
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return sendError(res, 'Invalid credentials', 401);
    }

    return sendError(res, 'Authentication failed', 500, error);
  }
};

/**
 * Create new user (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    // Validation
    if (!name || !email || !role) {
      return sendValidationError(res, [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'role', message: 'Role is required' }
      ]);
    }

    const validRoles = ['ADMIN', 'TRAFFIC_POLICE', 'EMERGENCY'];
    if (!validRoles.includes(role)) {
      return sendValidationError(res, [
        { field: 'role', message: 'Invalid role specified' }
      ]);
    }

    // Create Firebase Auth user
    const tempPassword = password || `TempPass_${Math.random().toString(36).slice(-8)}`;
    
    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: name,
      emailVerified: true
    });

    // Determine access level based on role
    const accessLevels = {
      'ADMIN': 5,
      'EMERGENCY': 3,
      'TRAFFIC_POLICE': 2
    };

    // Create Firestore user document
    const userData = {
      uid: userRecord.uid,
      name,
      email,
      role,
      status: 'ACTIVE',
      accessLevel: accessLevels[role],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      permissions: [],
      lastLogin: null
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Log user creation
    await db.collection('auditLogs').add({
      action: 'USER_CREATE',
      userId: req.user.uid,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetUserId: userRecord.uid,
      targetUserEmail: email,
      targetUserRole: role,
      ip: req.ip,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'SUCCESS'
    });

    logger.info('User created successfully:', {
      createdBy: req.user.uid,
      newUser: userRecord.uid,
      role
    });

    return sendSuccess(res, {
      uid: userRecord.uid,
      email,
      name,
      role,
      tempPassword: password ? undefined : tempPassword // Only return temp password if we generated it
    }, 'User created successfully', 201);

  } catch (error) {
    logger.error('User creation failed:', error);

    if (error.code === 'auth/email-already-exists') {
      return sendError(res, 'Email already registered', 400);
    }

    return sendError(res, 'Failed to create user', 500, error);
  }
};

/**
 * Logout - Invalidate token (client-side)
 */
const logout = async (req, res) => {
  try {
    // Log logout event
    await db.collection('auditLogs').add({
      action: 'USER_LOGOUT',
      userId: req.user.uid,
      userEmail: req.user.email,
      userRole: req.user.role,
      ip: req.ip,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'SUCCESS'
    });

    logger.info('User logged out:', { uid: req.user.uid });
    
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    return sendError(res, 'Logout failed', 500, error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return sendError(res, 'User profile not found', 404);
    }

    const userData = userDoc.data();
    
    // Remove sensitive data
    delete userData.permissions;
    
    return sendSuccess(res, userData, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Get profile failed:', error);
    return sendError(res, 'Failed to get profile', 500, error);
  }
};

module.exports = {
  login,
  createUser,
  logout,
  getProfile
};
