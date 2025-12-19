const mongoose = require('mongoose');
const { WALLET_TRANSACTION_TYPES } = require('../config/constants');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(WALLET_TRANSACTION_TYPES),
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // Balance before and after transaction
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  // Transaction details
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['add_money', 'order_payment', 'refund', 'cashback', 'bonus', 'penalty', 'withdrawal'],
    required: true
  },
  // Related references
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  paymentGateway: {
    name: String,
    transactionId: String,
    status: String
  },
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed'
  },
  // For failed transactions
  failureReason: String,
  // For reversals/refunds
  reversedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  isReversed: {
    type: Boolean,
    default: false
  },
  reversedAt: Date,
  // Processing details
  processedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ type: 1, status: 1 });

// Generate unique transaction ID
transactionSchema.statics.generateTransactionId = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Count today's transactions
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const count = await this.countDocuments({
    createdAt: { $gte: startOfDay }
  });
  
  const sequence = (count + 1).toString().padStart(6, '0');
  return `TXN${year}${month}${day}${sequence}`;
};

// Mark transaction as completed
transactionSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
};

// Mark transaction as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
};

// Reverse transaction
transactionSchema.methods.reverse = async function() {
  if (this.isReversed) {
    throw new Error('Transaction already reversed');
  }
  
  this.isReversed = true;
  this.reversedAt = new Date();
  
  // Create reversal transaction
  const reversalType = this.type === WALLET_TRANSACTION_TYPES.CREDIT 
    ? WALLET_TRANSACTION_TYPES.DEBIT 
    : WALLET_TRANSACTION_TYPES.CREDIT;
  
  return {
    type: reversalType,
    amount: this.amount,
    description: `Reversal of ${this.transactionId}`,
    reversedTransaction: this._id
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);