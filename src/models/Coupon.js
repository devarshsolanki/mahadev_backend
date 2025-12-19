const mongoose = require('mongoose');
const { COUPON_TYPES } = require('../config/constants');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Coupon code cannot exceed 20 characters']
  },
  description: {
    type: String,
    required: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: Object.values(COUPON_TYPES),
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  // Minimum cart value to apply coupon
  minCartValue: {
    type: Number,
    default: 0,
    min: 0
  },
  // Maximum discount amount (for percentage coupons)
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  // Validity period
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  // Usage limits
  usageLimit: {
    type: Number,
    min: 1
  },
  usageLimitPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // User restrictions
  applicableUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Category restrictions
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  // Product restrictions
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // First order only
  isFirstOrderOnly: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Display settings
  isPublic: {
    type: Boolean,
    default: true
  },
  displayText: String
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return { valid: false, message: 'Coupon is not active' };
  
  // Check date validity
  if (now < this.startDate) return { valid: false, message: 'Coupon is not yet active' };
  if (now > this.endDate) return { valid: false, message: 'Coupon has expired' };
  
  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }
  
  return { valid: true };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function(cartSubtotal) {
  switch (this.type) {
    case COUPON_TYPES.PERCENTAGE:
      let discount = (cartSubtotal * this.value) / 100;
      if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
        discount = this.maxDiscountAmount;
      }
      return Math.round(discount * 100) / 100;
      
    case COUPON_TYPES.FLAT:
      return Math.min(this.value, cartSubtotal);
      
    case COUPON_TYPES.FREE_DELIVERY:
      return 0; // Handled separately in cart
      
    default:
      return 0;
  }
};

// Check if user can use this coupon
couponSchema.methods.canUserApply = async function(userId, userOrderCount) {
  // Check first order restriction
  if (this.isFirstOrderOnly && userOrderCount > 0) {
    return { canApply: false, message: 'This coupon is only valid for first order' };
  }
  
  // Check user-specific restrictions
  if (this.applicableUsers.length > 0) {
    const isApplicable = this.applicableUsers.some(
      id => id.toString() === userId.toString()
    );
    if (!isApplicable) {
      return { canApply: false, message: 'This coupon is not applicable for your account' };
    }
  }
  
  // Check usage limit per user
  const CouponUsage = mongoose.model('CouponUsage');
  const userUsageCount = await CouponUsage.countDocuments({
    coupon: this._id,
    user: userId
  });
  
  if (userUsageCount >= this.usageLimitPerUser) {
    return { canApply: false, message: 'You have already used this coupon' };
  }
  
  return { canApply: true };
};

module.exports = mongoose.model('Coupon', couponSchema);