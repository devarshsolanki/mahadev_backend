const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Snapshot of product details at time of adding to cart
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

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  
  // Pricing breakdown
  subtotal: {
    type: Number,
    default: 0,
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
    default: 0,
    min: 0
  },
  
  // Applied coupon
  appliedCoupon: {
    code: String,
    discountAmount: Number,
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    }
  },
  
  // Delivery address
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.addresses'
  },
  
  // Cart status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Expiry for abandoned cart
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ user: 1, isActive: 1 });
cartSchema.index({ updatedAt: -1 });

// Calculate cart totals
cartSchema.methods.calculateTotals = function(deliveryFee = 0, taxRate = 0) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Apply coupon discount if exists
  this.discount = this.appliedCoupon?.discountAmount || 0;
  
  // Delivery fee
  this.deliveryFee = deliveryFee;
  
  // Calculate tax on (subtotal - discount + delivery)
  const taxableAmount = this.subtotal - this.discount + this.deliveryFee;
  this.tax = Math.round(taxableAmount * taxRate * 100) / 100;
  
  // Calculate total
  this.total = this.subtotal - this.discount + this.deliveryFee + this.tax;
  
  // Ensure no negative values
  this.total = Math.max(0, this.total);
};

// Add item to cart
cartSchema.methods.addItem = function(product, quantity, variantId = null) {
  const existingItemIndex = this.items.findIndex(item => {
    if (variantId) {
      return item.product.toString() === product._id.toString() && 
             item.variantId?.toString() === variantId.toString();
    }
    return item.product.toString() === product._id.toString() && !item.variantId;
  });
  
  const price = product.price;
  const productSnapshot = {
    name: product.name,
    image: product.images?.[0]?.url || null,
    sku: product.sku,
    weight: product.weight
  };
  
  if (existingItemIndex > -1) {
    // Update quantity if item exists
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].price = price;
    this.items[existingItemIndex].productSnapshot = productSnapshot;
  } else {
    // Add new item
    this.items.push({
      product: product._id,
      variantId,
      quantity,
      price,
      productSnapshot
    });
  }
  
  this.calculateTotals();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    this.items.pull(itemId);
  } else {
    item.quantity = quantity;
  }
  
  this.calculateTotals();
};

// Remove item from cart
cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  this.calculateTotals();
};

// Clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupon = undefined;
  this.calculateTotals();
};

// Get total items count
cartSchema.methods.getTotalItems = function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

module.exports = mongoose.model('Cart', cartSchema);