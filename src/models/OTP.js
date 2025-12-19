const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // E.164 format: optional +, followed by 1-3 digit country code, then 4-14 digits
        // Examples: +1234567890, +911234567890, 1234567890 (US), 9876543210
        const e164Regex = /^[+]?[0-9]{10,15}$/;
        return e164Regex.test(v);
      },
      message: props => `${props.value} is not a valid phone number. Use E.164 format: +1234567890 or 10-15 digits`
    }
  },
  otp: {
    type: String,
    required: true,
    match: [/^[0-9]{4,6}$/, 'OTP must be 4-6 digits']
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - automatically delete expired documents
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1
  },
  sentVia: {
    type: String,
    enum: ['sms', 'email', 'whatsapp'],
    default: 'sms'
  },
  twilioMessageSid: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
otpSchema.index({ phone: 1, createdAt: -1 });
otpSchema.index({ phone: 1, isUsed: 1 });

// Pre-save middleware to normalize phone number
otpSchema.pre('save', function(next) {
  if (this.isModified('phone') && !this.phone.startsWith('+')) {
    // Auto-prefix common formats
    if (this.phone.length === 10) {
      // Assume 10-digit US number
      this.phone = '+1' + this.phone;
    } else if (this.phone.length === 12 && this.phone.startsWith('91')) {
      // Indian number starting with 91
      this.phone = '+' + this.phone;
    }
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema);