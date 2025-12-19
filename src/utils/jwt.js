const jwt = require('jsonwebtoken');
const logger = require('./logger');

class JWTUtil {
  // Generate access token
  static generateAccessToken(userId, role) {
    try {
      return jwt.sign(
        { userId, role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '30m' }
      );
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  // Generate refresh token
  static generateRefreshToken(userId) {
    try {
      return jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
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