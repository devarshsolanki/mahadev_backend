const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } = require('../config/constants');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: mongoose.Schema.Types.ObjectId,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Snapshot at time of order
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

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
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
  
  // Coupon details
  coupon: {
    code: String,
    discountAmount: Number,
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    }
  },
  
  // Delivery details
  deliveryAddress: {
    label: String,
    fullAddress: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number
  },
  
  // Payment details
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
    required: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date
  },
  
  // Order status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  
  // Delivery partner
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps for status changes
  confirmedAt: Date,
  processingAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  
  // Cancellation details
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Delivery time slot
  deliverySlot: {
    date: Date,
    startTime: String,
    endTime: String
  },
  
  // Estimated delivery
  estimatedDeliveryTime: Date,
  
  // Notes
  customerNotes: String,
  internalNotes: String,
  
  // Subscription order flag
  isSubscriptionOrder: {
    type: Boolean,
    default: false
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });
orderSchema.index({ 'deliveryAddress.pincode': 1 });

// Generate unique order number
orderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Count today's orders
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const count = await this.countDocuments({
    createdAt: { $gte: startOfDay }
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${sequence}`;
};

// Update order status
orderSchema.methods.updateStatus = function(newStatus, updatedBy = null) {
  this.status = newStatus;
  
  const now = new Date();
  switch (newStatus) {
    case ORDER_STATUS.CONFIRMED:
      this.confirmedAt = now;
      break;
    case ORDER_STATUS.PROCESSING:
      this.processingAt = now;
      break;
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      this.outForDeliveryAt = now;
      break;
    case ORDER_STATUS.DELIVERED:
      this.deliveredAt = now;
      this.paymentStatus = PAYMENT_STATUS.COMPLETED;
      break;
    case ORDER_STATUS.CANCELLED:
      this.cancelledAt = now;
      this.cancelledBy = updatedBy;
      break;
  }
};

// Calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  this.total = this.subtotal - this.discount + this.deliveryFee + this.tax;
  this.total = Math.max(0, this.total);
};

module.exports = mongoose.model('Order', orderSchema);