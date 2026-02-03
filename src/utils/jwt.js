const jwt = require('jsonwebtoken');
const logger = require('./logger');

class JWTUtil {
  // Get the appropriate expiry based on NODE_ENV
  static getAccessExpiry() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isDevelopment 
      ? (process.env.JWT_ACCESS_EXPIRY_DEV || '7d')
      : (process.env.JWT_ACCESS_EXPIRY_PROD || '30m');
  }

  static getRefreshExpiry() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isDevelopment 
      ? (process.env.JWT_REFRESH_EXPIRY_DEV || '30d')
      : (process.env.JWT_REFRESH_EXPIRY_PROD || '7d');
  }

  // Generate access token
  static generateAccessToken(userId, role) {
    try {
      const expiresIn = this.getAccessExpiry();
      logger.info(`[JWT] Generating access token with expiry: ${expiresIn} (NODE_ENV: ${process.env.NODE_ENV})`);
      
      return jwt.sign(
        { userId, role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn }
      );
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  // Generate refresh token
  static generateRefreshToken(userId) {
    try {
      const expiresIn = this.getRefreshExpiry();
      logger.info(`[JWT] Generating refresh token with expiry: ${expiresIn} (NODE_ENV: ${process.env.NODE_ENV})`);
      
      return jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn }
      );
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Generate both tokens
  static generateTokens(userId, role) {
    return {
      accessToken: this.generateAccessToken(userId, role),
      refreshToken: this.generateRefreshToken(userId)
    };
  }

  // Verify access token
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  // Decode token without verification (for debugging)
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JWTUtil;