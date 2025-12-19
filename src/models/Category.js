const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String]
}, {
  timestamps: true
});

// Index for efficient queries
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });

// Generate slug from name before validation so `required` checks for `slug`
// don't fail when the client omits it. Use pre('validate') so slug is set
// before Mongoose runs schema validators (required, unique etc.).
categorySchema.pre('validate', function(next) {
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
    // If slug generation fails for any reason, continue and let
    // validators/reporting handle it downstream.
    // Do not crash the save flow.
    // eslint-disable-next-line no-console
    console.warn('Slug generation warning:', err);
  }
  next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Method to get full category path
categorySchema.methods.getPath = async function() {
  const path = [this.name];
  let current = this;
  
  while (current.parentCategory) {
    current = await this.model('Category').findById(current.parentCategory);
    if (current) {
      path.unshift(current.name);
    }
  }
  
  return path.join(' > ');
};

module.exports = mongoose.model('Category', categorySchema);