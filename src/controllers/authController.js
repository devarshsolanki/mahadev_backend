const User = require('../models/User');
const OTPService = require('../services/otpService');
const JWTUtil = require('../utils/jwt');
const logger = require('../utils/logger');
const { STATUS_CODES } = require('../config/constants');

class AuthController {
  // Send OTP for login/registration
  static async sendOTP(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Send OTP
      const result = await OTPService.sendOTP(phone);

      return res.status(STATUS_CODES.OK).json(result);

    } catch (error) {
      logger.error('Send OTP error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to send OTP'
      });
    }
  }

  // Verify OTP and login/register user
  static async verifyOTP(req, res) {
    try {
      const { phone, otp, name } = req.body;

      if (!phone || !otp) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Phone number and OTP are required'
        });
      }

      // Verify OTP
      const otpResult = await OTPService.verifyOTP(phone, otp);

      if (!otpResult.success) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json(otpResult);
      }

      // Find or create user
      let user = await User.findOne({ phone });
      let isNewUser = false;

      if (!user) {
        // Create new user
        if (!name) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Name is required for new users'
          });
        }

        user = await User.create({
          name,
          phone,
          isVerified: true
        });
        
        isNewUser = true;
        logger.info(`New user registered: ${phone}`);
      } else {
        // Update verification status and last login
        user.isVerified = true;
        user.lastLogin = new Date();
        await user.save();
      }

      // Generate tokens
      const tokens = JWTUtil.generateTokens(user._id, user.role);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: isNewUser ? 'Registration successful' : 'Login successful',
        isNewUser,
        user: user.getPublicProfile(),
        ...tokens
      });

    } catch (error) {
      logger.error('Verify OTP error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to verify OTP'
      });
    }
  }

  // Resend OTP
  static async resendOTP(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await OTPService.resendOTP(phone);

      return res.status(STATUS_CODES.OK).json(result);

    } catch (error) {
      logger.error('Resend OTP error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to resend OTP'
      });
    }
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Generate new access token
      const accessToken = JWTUtil.generateAccessToken(user._id, user.role);
      // Optionally generate a new refresh token for rotation
      const newRefreshToken = JWTUtil.generateRefreshToken(user._id);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      logger.error('Refresh token error:', error);
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: error.message || 'Invalid refresh token'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        user: user.getPublicProfile()
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { name, email, addresses } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (email) updates.email = email;
      
      // Handle address updates if provided
      if (addresses) {
        // If there's a new default address, unset existing default
        const hasNewDefault = addresses.some(addr => addr.isDefault);
        if (hasNewDefault) {
          await User.findById(req.user.userId).then(user => {
            if (user.addresses) {
              user.addresses.forEach(addr => {
                if (addr.isDefault) addr.isDefault = false;
              });
              user.save();
            }
          });
        }
        updates.addresses = addresses;
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        updates,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Profile updated successfully',
        user: user.getPublicProfile()
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  // Logout (optional - mainly for clearing FCM token)
  static async logout(req, res) {
    try {
      // Clear FCM token if provided
      if (req.body.fcmToken) {
        await User.findByIdAndUpdate(req.user.userId, {
          $unset: { fcmToken: 1 }
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to logout'
      });
    }
  }

  // Test SMS endpoint - for debugging Twilio integration
  // Usage: POST /api/v1/auth/test-sms with { "phone": "+1234567890" }
  static async testSMS(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Phone number is required',
          format: 'E.164 format (e.g., +1234567890 or +911234567890)'
        });
      }

      logger.info('🧪 Test SMS endpoint called', { phone });

      // Call OTP service to send SMS without creating OTP
      try {
        const result = await OTPService.sendOTP(phone);
        
        logger.info('✅ Test SMS completed', {
          phone,
          success: result.success,
          smsSent: result.smsSent,
          messageSid: result.messageSid
        });

        return res.status(STATUS_CODES.OK).json({
          success: true,
          message: 'Test SMS sent',
          ...result,
          debugInfo: {
            nodeEnv: process.env.NODE_ENV,
            sendInDev: process.env.TWILIO_SEND_IN_DEV === 'true',
            twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
            senderPhone: process.env.TWILIO_PHONE_NUMBER
          }
        });
      } catch (smsError) {
        logger.error('❌ Test SMS failed', {
          phone,
          error: smsError.message
        });

        return res.status(STATUS_CODES.SERVER_ERROR).json({
          success: false,
          message: `SMS test failed: ${smsError.message}`,
          debugInfo: {
            nodeEnv: process.env.NODE_ENV,
            sendInDev: process.env.TWILIO_SEND_IN_DEV === 'true',
            twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
            senderPhone: process.env.TWILIO_PHONE_NUMBER,
            error: smsError.message
          }
        });
      }

    } catch (error) {
      logger.error('Test SMS error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to test SMS'
      });
    }
  }
}

module.exports = AuthController;