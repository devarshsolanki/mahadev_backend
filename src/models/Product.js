const mongoose = require('mongoose');
const { PRODUCT_STATUS } = require('../config/constants');

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    sparse: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'pcs']
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  brand: {
    type: String,
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  variants: [variantSchema],
  
  // Pricing (for single variant products)
  price: {
    type: Number,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  
  // Inventory
  sku: {
    type: String,
    sparse: true,
    uppercase: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  
  // Unit and MRP fields
  unit: {
    type: String,
    trim: true,
    default: 'piece',
    example: ['1kg', '500g', '1L']
  },
  mrp: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Product attributes
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'pcs']
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'inch'],
      default: 'cm'
    }
  },
  
  // Product details
  tags: [String],
  ingredients: String,
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fat: Number,
    fiber: Number,
    servingSize: String
  },
  
  // Status and visibility
  status: {
    type: String,
    enum: Object.values(PRODUCT_STATUS),
    default: PRODUCT_STATUS.ACTIVE
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Subscription
  isSubscriptionAvailable: {
    type: Boolean,
    default: false
  },
  
  // Ratings and reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Sales
  totalSales: {
    type: Number,
    default: 0
  },
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  
  // Timestamps for discounts
  discountStartDate: Date,
  discountEndDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
productSchema.index({ category: 1, status: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, status: 1 });

// Generate slug from name before validation so `required` checks for `slug`
// don't fail when the client omits it. Use pre('validate') so slug is set
// before Mongoose runs schema validators (required, unique etc.).
productSchema.pre('validate', function(next) {
  try {
    if (this.isModified('name') || !this.slug) {
      if (this.name) {
        this.slug = this.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    }
  } catch (err) {
    // Do not crash the save flow - let validators handle any issues
    // eslint-disable-next-line no-console
    console.warn('Product slug generation warning:', err);
  }
  next();
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  // Prefer explicit `mrp` if present, fall back to legacy `comparePrice`
  const mrpValue = (typeof this.mrp === 'number' && this.mrp > 0) ? this.mrp : this.comparePrice;
  if (mrpValue && this.price && mrpValue > this.price) {
    return Math.round(((mrpValue - this.price) / mrpValue) * 100);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Virtual for active discount
productSchema.virtual('hasActiveDiscount').get(function() {
  const now = new Date();
  if (this.discountStartDate && this.discountEndDate) {
    return now >= this.discountStartDate && now <= this.discountEndDate;
  }
  return false;
});

// Method to check availability
productSchema.methods.isAvailable = function() {
  return this.status === PRODUCT_STATUS.ACTIVE && 
         this.isPublished && 
         this.stock > 0;
};

// Method to decrease stock
productSchema.methods.decreaseStock = async function(quantity) {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  this.totalSales += quantity;
  await this.save();
};

// Method to increase stock
productSchema.methods.increaseStock = async function(quantity) {
  this.stock += quantity;
  await this.save();
};

module.exports = mongoose.model('Product', productSchema);