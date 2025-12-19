const JWTUtil = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const { STATUS_CODES, USER_ROLES } = require('../config/constants');

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = JWTUtil.verifyAccessToken(token);

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('_id role isActive');

    if (!user || !user.isActive) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = JWTUtil.verifyAccessToken(token);
      
      const user = await User.findById(decoded.userId).select('_id role isActive');
      
      if (user && user.isActive) {
        req.user = {
          userId: decoded.userId,
          role: decoded.role
        };
      }
    }

    next();

  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};