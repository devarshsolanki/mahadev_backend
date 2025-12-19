const twilio = require('twilio');
const OTP = require('../models/OTP');
const logger = require('../utils/logger');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const sendInDev = process.env.TWILIO_SEND_IN_DEV === 'true';
const nodeEnv = process.env.NODE_ENV || 'development';

let client = null;
let initError = null;

// Initialize Twilio client with enhanced logging
if (accountSid && authToken) {
  try {
    // Validate Account SID format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      throw new Error(`Invalid Account SID format. Expected 34-char string starting with 'AC', got: ${accountSid}`);
    }
    
    // Validate Auth Token format (should be 32 chars hex)
    if (!/^[a-f0-9]{32}$/i.test(authToken)) {
      throw new Error(`Invalid Auth Token format. Expected 32-char hex string, got: ${authToken}`);
    }
    
    client = twilio(accountSid, authToken);
    logger.info('✅ Twilio client initialized successfully', {
      accountSid: accountSid.substring(0, 4) + '***' + accountSid.substring(-4),
      phoneNumber: twilioPhoneNumber,
      sendInDev,
      nodeEnv
    });
  } catch (e) {
    initError = e.message;
    logger.error('❌ Failed to initialize Twilio client', {
      error: e.message,
      accountSidLength: accountSid?.length,
      authTokenLength: authToken?.length
    });
    client = null;
  }
} else {
  initError = 'Twilio credentials not found in environment';
  logger.warn('❌ Twilio credentials not found in environment; SMS sending disabled', {
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasPhoneNumber: !!twilioPhoneNumber
  });
}

class OTPService {
  // Generate random OTP
  static generateOTP() {
    const length = parseInt(process.env.OTP_LENGTH) || 6;
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    
    return otp;
  }

  // Send OTP via SMS
  static async sendOTP(phone) {
    let smsResponse = null;
    
    try {
      logger.debug('📱 Sending OTP - START', { phone });
      
      // Validate phone number format
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        const error = `Invalid phone format. Expected E.164 (+1234567890) or digits only, got: ${phone}`;
        logger.warn('⚠️  Phone validation failed', { phone, error });
        throw new Error(error);
      }
      
      // Normalize phone number to E.164 format if missing '+'
      let normalizedPhone = phone;
      if (!phone.startsWith('+')) {
        // If no +, assume it's a 10-digit US number
        if (phone.length === 10) {
          normalizedPhone = '+1' + phone;
          logger.debug('📱 Normalized phone number (10-digit US)', { original: phone, normalized: normalizedPhone });
        } else {
          // For other countries, log warning
          logger.warn('⚠️  Phone number missing country code prefix', { phone });
        }
      }

      // Generate OTP
      const otpCode = this.generateOTP();
      
      // Calculate expiry time
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      logger.debug('📝 OTP generated', { 
        phone: normalizedPhone, 
        otpCode, 
        expiryMinutes,
        expiresAt: expiresAt.toISOString()
      });

      // Delete any existing OTPs for this phone number
      const deletedCount = await OTP.deleteMany({ phone: normalizedPhone });
      logger.debug('🗑️  Cleared old OTPs', { phone: normalizedPhone, deletedCount: deletedCount.deletedCount });

      // Store OTP in database
      const otpDoc = await OTP.create({
        phone: normalizedPhone,
        otp: otpCode,
        expiresAt
      });
      logger.debug('💾 OTP stored in database', { documentId: otpDoc._id });

      // Decide whether to actually send SMS
      const canSendSms = client && twilioPhoneNumber;
      const shouldSendSms = canSendSms && (nodeEnv === 'production' || sendInDev);

      logger.debug('🔍 SMS sending decision', {
        client: !!client,
        initError,
        twilioPhoneNumber,
        canSendSms,
        nodeEnv,
        sendInDev,
        shouldSendSms
      });

      if (shouldSendSms) {
        try {
          logger.debug('📤 Sending SMS via Twilio', {
            from: twilioPhoneNumber,
            to: normalizedPhone,
            bodyLength: `Your QuickCommerce OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes.`.length
          });

          smsResponse = await client.messages.create({
            body: `Your QuickCommerce OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes.`,
            from: twilioPhoneNumber,
            to: normalizedPhone
          });

          logger.info('✅ SMS sent successfully', {
            messageSid: smsResponse.sid,
            status: smsResponse.status,
            phone: normalizedPhone,
            timestamp: new Date().toISOString()
          });
        } catch (twilioError) {
          logger.error('❌ Twilio API error', {
            error: twilioError.message,
            code: twilioError.code,
            status: twilioError.status,
            details: twilioError.details,
            phone: normalizedPhone,
            accountSid: accountSid?.substring(0, 4) + '***',
            fromNumber: twilioPhoneNumber
          });
          throw twilioError;
        }
      } else {
        // In development or when Twilio isn't configured, log OTP for debugging
        logger.warn('⏭️  SMS NOT SENT', {
          reason: !client ? 'No Twilio client' : !twilioPhoneNumber ? 'No sender phone number' : `env=${nodeEnv}, sendInDev=${sendInDev}`,
          debugInfo: {
            phone: normalizedPhone,
            otp: otpCode,
            canSendSms,
            shouldSendSms,
            nodeEnv,
            sendInDev
          }
        });
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
        // Only return OTP in development
        ...(nodeEnv !== 'production' && { otp: otpCode }),
        smsSent: shouldSendSms,
        messageSid: smsResponse?.sid
      };

    } catch (error) {
      logger.error('❌ Error sending OTP', {
        error: error.message,
        phone,
        stack: error.stack?.substring(0, 500)
      });
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // Verify OTP
  static async verifyOTP(phone, otp) {
    try {
      // Find the most recent OTP for this phone
      const otpDoc = await OTP.findOne({
        phone,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpDoc) {
        return {
          success: false,
          message: 'OTP expired or invalid'
        };
      }

      // Check if max attempts exceeded
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        await otpDoc.deleteOne();
        return {
          success: false,
          message: 'Maximum verification attempts exceeded'
        };
      }

      // Increment attempts
      otpDoc.attempts += 1;
      await otpDoc.save();

      // Verify OTP
      if (otpDoc.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP',
          attemptsLeft: otpDoc.maxAttempts - otpDoc.attempts
        };
      }

      // Mark OTP as used
      otpDoc.isUsed = true;
      await otpDoc.save();

      logger.info(`OTP verified successfully for ${phone}`);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Resend OTP (with rate limiting)
  static async resendOTP(phone) {
    try {
      // Check if last OTP was sent less than 1 minute ago
      const recentOTP = await OTP.findOne({
        phone,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
      });

      if (recentOTP) {
        return {
          success: false,
          message: 'Please wait before requesting a new OTP',
          retryAfter: 60 - Math.floor((Date.now() - recentOTP.createdAt) / 1000)
        };
      }

      // Send new OTP
      return await this.sendOTP(phone);

    } catch (error) {
      logger.error('Error resending OTP:', error);
      throw new Error('Failed to resend OTP');
    }
  }
}

module.exports = OTPService;