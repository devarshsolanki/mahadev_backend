const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    enum: ['home', 'work', 'other']
  },
  fullAddress: {
    type: String,
    required: true
  },
  landmark: String,
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  latitude: Number,
  longitude: Number,
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CUSTOMER
  },
  addresses: [addressSchema],
  profilePicture: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  fcmToken: String, // For push notifications
  
  // For Delivery Partners
  deliveryPartnerDetails: {
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle', 'car']
    },
    vehicleNumber: String,
    drivingLicense: String,
    isAvailable: {
      type: Boolean,
      default: true
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  }
}, {
  timestamps: true
});

// Index for geospatial queries
userSchema.index({ 'deliveryPartnerDetails.currentLocation': '2dsphere' });

// Make email unique but only when it exists (allow multiple docs without email)
// Using sparse + partialFilterExpression to avoid duplicate key errors for null/absent emails
userSchema.index(
  { email: 1 },
  // Note: MongoDB does not allow mixing `sparse` with `partialFilterExpression`.
  // Keep `partialFilterExpression` which is more explicit and supported.
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.fcmToken;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);