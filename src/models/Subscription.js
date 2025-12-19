const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS, SUBSCRIPTION_FREQUENCY } = require('../config/constants');

const subscriptionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Snapshot at subscription creation for historical reference
  productSnapshot: {
    name: String,
    image: String,
    sku: String,
    weight: {
      value: Number,
      unit: String
    }
  }
}, { _id: true });

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: {
    type: [subscriptionItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  
  // Subscription frequency and timing
  frequency: {
    type: String,
    enum: Object.values(SUBSCRIPTION_FREQUENCY),
    required: true,
    index: true
  },
  
  // Delivery time (hour and minute in 24-hour format)
  deliveryTime: {
    hour: {
      type: Number,
      min: [0, 'Hour must be between 0-23'],
      max: [23, 'Hour must be between 0-23'],
      default: 8
    },
    minute: {
      type: Number,
      min: [0, 'Minute must be between 0-59'],
      max: [59, 'Minute must be between 0-59'],
      default: 0
    }
  },
  
  // For weekly subscriptions (0 = Sunday, 6 = Saturday)
  deliveryDays: {
    type: [
      {
        type: Number,
        min: 0,
        max: 6
      }
    ],
    default: null,
    validate: {
      validator: function(days) {
        // If weekly frequency, days must be set
        if (this.frequency === SUBSCRIPTION_FREQUENCY.WEEKLY) {
          return days && days.length > 0;
        }
        return true;
      },
      message: 'Delivery days are required for weekly subscriptions'
    }
  },
  
  // For monthly subscriptions (1-31)
  deliveryDate: {
    type: Number,
    min: [1, 'Day must be between 1-31'],
    max: [31, 'Day must be between 1-31'],
    default: null,
    validate: {
      validator: function(date) {
        // If monthly frequency, date must be set
        if (this.frequency === SUBSCRIPTION_FREQUENCY.MONTHLY) {
          return date && date >= 1 && date <= 31;
        }
        return true;
      },
      message: 'Delivery date is required for monthly subscriptions'
    }
  },
  
  // Delivery address
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.addresses',
    required: true
  },
  
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    required: true,
    default: 'wallet'
  },
  
  // Subscription status
  status: {
    type: String,
    enum: Object.values(SUBSCRIPTION_STATUS),
    default: SUBSCRIPTION_STATUS.ACTIVE,
    index: true
  },
  
  // Important dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  nextDeliveryDate: {
    type: Date,
    required: true,
    index: true
  },
  lastDeliveryDate: {
    type: Date,
    default: null
  },
  
  // Pause management
  pausedAt: {
    type: Date,
    default: null
  },
  pauseReason: String,
  resumeDate: {
    type: Date,
    default: null
  },
  
  // Cancellation
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: String,
  
  // Statistics
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  successfulOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  failedOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Failure tracking for auto-pause
  consecutiveFailures: {
    type: Number,
    default: 0,
    min: 0
  },
  maxConsecutiveFailures: {
    type: Number,
    default: 3,
    min: 1
  },
  
  // Notes
  customerNotes: String,
  internalNotes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, nextDeliveryDate: 1 });
subscriptionSchema.index({ frequency: 1 });
subscriptionSchema.index({ createdAt: -1 });

// Pre-save validation
subscriptionSchema.pre('save', function(next) {
  // Validate frequency-specific fields
  if (this.frequency === SUBSCRIPTION_FREQUENCY.WEEKLY) {
    if (!this.deliveryDays || this.deliveryDays.length === 0) {
      return next(new Error('Delivery days are required for weekly subscriptions'));
    }
  }
  
  if (this.frequency === SUBSCRIPTION_FREQUENCY.MONTHLY) {
    if (!this.deliveryDate || this.deliveryDate < 1 || this.deliveryDate > 31) {
      return next(new Error('Valid delivery date (1-31) is required for monthly subscriptions'));
    }
  }
  
  // Validate delivery time
  if (this.deliveryTime.hour < 0 || this.deliveryTime.hour > 23) {
    return next(new Error('Hour must be between 0-23'));
  }
  if (this.deliveryTime.minute < 0 || this.deliveryTime.minute > 59) {
    return next(new Error('Minute must be between 0-59'));
  }
  
  next();
});

// Generate unique subscription ID
subscriptionSchema.statics.generateSubscriptionId = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Count this month's subscriptions
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const count = await this.countDocuments({
    createdAt: { $gte: startOfMonth }
  });
  
  const sequence = (count + 1).toString().padStart(5, '0');
  return `SUB${year}${month}${sequence}`;
};

// Calculate next delivery date based on frequency and current date
subscriptionSchema.methods.calculateNextDeliveryDate = function(fromDate = null) {
  const baseDate = fromDate ? new Date(fromDate) : new Date();
  const result = new Date(baseDate);
  
  switch (this.frequency) {
    case SUBSCRIPTION_FREQUENCY.DAILY:
      // Next delivery is tomorrow at the specified time
      result.setDate(result.getDate() + 1);
      break;
      
    case SUBSCRIPTION_FREQUENCY.WEEKLY:
      // Find next occurrence of specified delivery day
      if (!this.deliveryDays || this.deliveryDays.length === 0) {
        throw new Error('Delivery days not set for weekly subscription');
      }
      
      result.setDate(result.getDate() + 1);
      
      // Keep incrementing until we hit one of the delivery days
      while (!this.deliveryDays.includes(result.getDay())) {
        result.setDate(result.getDate() + 1);
      }
      break;
      
    case SUBSCRIPTION_FREQUENCY.MONTHLY:
      // Next delivery is same date next month
      if (!this.deliveryDate || this.deliveryDate < 1 || this.deliveryDate > 31) {
        throw new Error('Valid delivery date not set for monthly subscription');
      }
      
      result.setMonth(result.getMonth() + 1);
      
      // Handle month-end edge case (e.g., Jan 31 -> Feb 28/29)
      const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      const day = Math.min(this.deliveryDate, lastDayOfMonth);
      result.setDate(day);
      break;
      
    default:
      throw new Error('Invalid subscription frequency');
  }
  
  // Set the time to the specified delivery hour and minute
  result.setHours(this.deliveryTime.hour, this.deliveryTime.minute, 0, 0);
  
  return result;
};

// Update next delivery date after successful order
subscriptionSchema.methods.updateNextDelivery = function() {
  this.lastDeliveryDate = new Date();
  this.nextDeliveryDate = this.calculateNextDeliveryDate(this.nextDeliveryDate);
};

// Pause subscription
subscriptionSchema.methods.pause = function(reason = '', resumeDate = null) {
  this.status = SUBSCRIPTION_STATUS.PAUSED;
  this.pausedAt = new Date();
  this.pauseReason = reason || 'User paused';
  if (resumeDate) {
    this.resumeDate = new Date(resumeDate);
  }
};

// Resume subscription
subscriptionSchema.methods.resume = function() {
  this.status = SUBSCRIPTION_STATUS.ACTIVE;
  this.pausedAt = null;
  this.pauseReason = null;
  this.resumeDate = null;
  this.consecutiveFailures = 0;
  
  // Recalculate next delivery based on current time
  this.nextDeliveryDate = this.calculateNextDeliveryDate();
};

// Cancel subscription
subscriptionSchema.methods.cancel = function(reason = '') {
  this.status = SUBSCRIPTION_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancellationReason = reason || 'User cancelled';
  this.endDate = new Date();
};

// Record successful order
subscriptionSchema.methods.recordSuccess = function(orderAmount) {
  this.totalOrders += 1;
  this.successfulOrders += 1;
  this.totalSpent += orderAmount;
  this.consecutiveFailures = 0;
  this.updateNextDelivery();
};

// Record failed order
subscriptionSchema.methods.recordFailure = function() {
  this.totalOrders += 1;
  this.failedOrders += 1;
  this.consecutiveFailures += 1;
  
  // Auto-pause if too many consecutive failures
  if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
    this.pause(`Auto-paused due to ${this.consecutiveFailures} consecutive payment failures`);
  }
};

// Check if subscription is due for processing
subscriptionSchema.methods.isDue = function() {
  if (this.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    return false;
  }
  return new Date() >= this.nextDeliveryDate;
};

// Recalculate pricing totals
subscriptionSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  this.total = this.subtotal + (this.deliveryFee || 0) + (this.tax || 0);
  this.total = Math.max(0, this.total);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);