const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  // Hold amount during order processing
  holdBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // Available balance = balance - holdBalance
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Security
  pin: {
    type: String,
    select: false,
    // Stored value will be a bcrypt hash. Keep schema permissive here
    // and enforce raw PIN length in controller/validation middleware.
    trim: true
  },
  isPinSet: {
    type: Boolean,
    default: false
  },
  // Limits
  dailyLimit: {
    type: Number,
    default: 10000
  },
  monthlyLimit: {
    type: Number,
    default: 50000
  },
  // Usage tracking
  lastTransactionAt: Date,
  totalCredited: {
    type: Number,
    default: 0
  },
  totalDebited: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});



// Virtual for available balance
walletSchema.virtual('availableBalance').get(function() {
  return this.balance - this.holdBalance;
});

// Check if sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.availableBalance >= amount;
};

// Add money to wallet
walletSchema.methods.credit = function(amount) {
  this.balance += amount;
  this.totalCredited += amount;
  this.lastTransactionAt = new Date();
};

// Deduct money from wallet
walletSchema.methods.debit = function(amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error('Insufficient wallet balance');
  }
  this.balance -= amount;
  this.totalDebited += amount;
  this.lastTransactionAt = new Date();
};

// Hold amount temporarily
walletSchema.methods.hold = function(amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error('Insufficient balance to hold');
  }
  this.holdBalance += amount;
};

// Release held amount
walletSchema.methods.release = function(amount) {
  this.holdBalance -= amount;
  if (this.holdBalance < 0) this.holdBalance = 0;
};

// Capture held amount (convert hold to actual debit)
walletSchema.methods.capture = function(amount) {
  if (this.holdBalance < amount) {
    throw new Error('Insufficient hold balance');
  }
  this.holdBalance -= amount;
  this.balance -= amount;
  this.totalDebited += amount;
  this.lastTransactionAt = new Date();
};

module.exports = mongoose.model('Wallet', walletSchema);