const { sendForbidden } = require('../utils/responses');
const { logger } = require('../utils/logger');

/**
 * Role-Based Access Control middleware
 * @param {Array} allowedRoles - Array of roles that can access this route
 * @param {Number} minimumAccessLevel - Minimum access level required (optional)
 */
const requireRole = (allowedRoles = [], minimumAccessLevel = 0) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    const { role, accessLevel = 1 } = req.user;

    // Check role-based access
    const hasRoleAccess = allowedRoles.includes(role) || allowedRoles.includes('*');
    
    // Check access level (higher number = more access)
    const hasLevelAccess = accessLevel >= minimumAccessLevel;

    if (!hasRoleAccess || !hasLevelAccess) {
      logger.warn('Access denied:', {
        userId: req.user.uid,
        userRole: role,
        userAccessLevel: accessLevel,
        requiredRoles: allowedRoles,
        minimumLevel: minimumAccessLevel
      });
      
      return sendForbidden(res, 'Insufficient permissions for this operation');
    }

    logger.debug('Access granted:', {
      userId: req.user.uid,
      role,
      accessLevel,
      endpoint: req.path
    });

    next();
  };
};

/**
 * Predefined role combinations for common access patterns
 */
const ROLES = {
  ADMIN_ONLY: ['ADMIN', 'admin'],
  POLICE_AND_ADMIN: ['TRAFFIC_POLICE', 'ADMIN', 'admin'],
  MEDICAL_AND_ADMIN: ['EMERGENCY', 'ADMIN', 'admin'],
  ALL_AUTHENTICATED: ['ADMIN', 'admin', 'TRAFFIC_POLICE', 'EMERGENCY'],
  EMERGENCY_RESPONDERS: ['TRAFFIC_POLICE', 'EMERGENCY', 'ADMIN', 'admin']
};

module.exports = { 
  requireRole, 
  ROLES 
};
