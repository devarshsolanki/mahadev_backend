require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Coupon = require('../src/models/Coupon');
const Wallet = require('../src/models/Wallet');
const logger = require('../src/utils/logger');

// ==========================
// 📦 Sample Data
// ==========================

// Categories
const categories = [
  {
    name: 'Fruits & Vegetables',
    description: 'Fresh fruits and vegetables',
    displayOrder: 1,
    isActive: true
  },
  {
    name: 'Dairy & Eggs',
    description: 'Milk, eggs, cheese, and dairy products',
    displayOrder: 2,
    isActive: true
  },
  {
    name: 'Bakery & Snacks',
    description: 'Bread, biscuits, and snacks',
    displayOrder: 3,
    isActive: true
  },
  {
    name: 'Beverages',
    description: 'Cold drinks, juices, and beverages',
    displayOrder: 4,
    isActive: true
  },
  {
    name: 'Staples',
    description: 'Rice, flour, pulses, and staples',
    displayOrder: 5,
    isActive: true
  }
];

// Helper to generate slug from name
const slugify = (name) => {
  return name
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Products
const getProducts = (categoryIds) => [
  {
    name: 'Fresh Tomatoes',
    description: 'Farm fresh red tomatoes, rich in vitamins',
    shortDescription: 'Fresh red tomatoes',
    category: categoryIds[0],
    price: 40,
    comparePrice: 50,
    stock: 100,
    sku: 'TOM-001',
    weight: { value: 500, unit: 'g' },
    tags: ['fresh', 'vegetables', 'organic'],
    isFeatured: true,
    isPublished: true,
    status: 'active'
  },
  {
    name: 'Green Apples',
    description: 'Crisp and juicy green apples from Kashmir',
    shortDescription: 'Crisp green apples',
    category: categoryIds[0],
    price: 150,
    comparePrice: 180,
    stock: 50,
    sku: 'APP-001',
    weight: { value: 1, unit: 'kg' },
    tags: ['fresh', 'fruits', 'imported'],
    isFeatured: true,
    isPublished: true,
    status: 'active'
  },
  {
    name: 'Full Cream Milk',
    description: 'Fresh full cream milk, rich in calcium',
    shortDescription: 'Full cream milk',
    category: categoryIds[1],
    price: 60,
    stock: 200,
    sku: 'MLK-001',
    weight: { value: 1, unit: 'l' },
    tags: ['dairy', 'fresh', 'milk'],
    isPublished: true,
    status: 'active'
  },
  {
    name: 'Brown Bread',
    description: 'Whole wheat brown bread, high in fiber',
    shortDescription: 'Whole wheat bread',
    category: categoryIds[2],
    price: 45,
    comparePrice: 50,
    stock: 80,
    sku: 'BRD-001',
    weight: { value: 400, unit: 'g' },
    tags: ['bakery', 'bread', 'healthy'],
    isPublished: true,
    status: 'active'
  },
  {
    name: 'Orange Juice',
    description: '100% pure orange juice with no added sugar',
    shortDescription: 'Pure orange juice',
    category: categoryIds[3],
    price: 120,
    stock: 60,
    sku: 'JUI-001',
    weight: { value: 1, unit: 'l' },
    tags: ['beverages', 'juice', 'healthy'],
    isFeatured: true,
    isPublished: true,
    status: 'active'
  },
  {
    name: 'Basmati Rice',
    description: 'Premium aged basmati rice from India',
    shortDescription: 'Premium basmati rice',
    category: categoryIds[4],
    price: 180,
    comparePrice: 200,
    stock: 150,
    sku: 'RIC-001',
    weight: { value: 5, unit: 'kg' },
    tags: ['staples', 'rice', 'premium'],
    isPublished: true,
    status: 'active'
  }
];

// Coupons
const coupons = [
  {
    code: 'WELCOME50',
    description: 'Flat ₹50 off on your first order',
    type: 'flat',
    value: 50,
    minCartValue: 200,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isFirstOrderOnly: true,
    usageLimitPerUser: 1,
    isActive: true,
    isPublic: true,
    displayText: 'Get ₹50 off on your first order!'
  },
  {
    code: 'SAVE20',
    description: '20% off on orders above ₹500',
    type: 'percentage',
    value: 20,
    minCartValue: 500,
    maxDiscountAmount: 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    usageLimitPerUser: 3,
    isActive: true,
    isPublic: true,
    displayText: 'Save 20% on orders above ₹500'
  },
  {
    code: 'FREESHIP',
    description: 'Free delivery on all orders',
    type: 'free_delivery',
    value: 0,
    minCartValue: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    usageLimitPerUser: 5,
    isActive: true,
    isPublic: true,
    displayText: 'Free delivery for everyone!'
  },
  {
    code: 'MEGA100',
    description: 'Flat ₹100 off on orders above ₹1000',
    type: 'flat',
    value: 100,
    minCartValue: 1000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usageLimit: 100,
    usageLimitPerUser: 1,
    isActive: true,
    isPublic: true,
    displayText: 'Mega Sale! ₹100 off on ₹1000+'
  }
];

// Users
const adminUser = {
  name: 'Admin User',
  phone: '+919999999999',
  email: 'admin@quickcommerce.com',
  role: 'admin',
  isVerified: true,
  isActive: true
};

const customerUser = {
  name: 'Test Customer',
  phone: '+919876543210',
  email: 'customer@test.com',
  role: 'customer',
  isVerified: true,
  isActive: true,
  addresses: [
    {
      label: 'home',
      fullAddress: '123, MG Road, Bangalore',
      landmark: 'Near City Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      isDefault: true
    }
  ]
};

// ==========================
// 🌱 Seed Function
// ==========================
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Coupon.deleteMany({}),
      Wallet.deleteMany({}),
      User.deleteMany({ role: { $in: ['admin', 'customer'] } })
    ]);
    logger.info('🧹 Cleared existing data');

    // Ensure categories have slugs (insertMany bypasses pre-save hooks)
    const categoriesWithSlugs = categories.map(cat => ({
      ...cat,
      slug: cat.slug ? cat.slug : slugify(cat.name)
    }));

    // Insert categories
    const insertedCategories = await Category.insertMany(categoriesWithSlugs);
    logger.info(`📦 Inserted ${insertedCategories.length} categories`);

    // Insert products
    const products = getProducts(insertedCategories.map(c => c._id));

    // Ensure products have slugs
    const productsWithSlugs = products.map(p => ({
      ...p,
      slug: p.slug ? p.slug : slugify(p.name)
    }));

    // In development, drop problematic nested unique index on variants.sku to avoid duplicate-null errors
    try {
      if (process.env.NODE_ENV !== 'production') {
        try {
          await Product.collection.dropIndex('variants.sku_1');
          logger.info('Dropped index variants.sku_1 to avoid duplicate null errors');
        } catch (err) {
          // ignore if index doesn't exist
        }
      }
    } catch (e) {
      // ignore any index drop errors
    }

    const insertedProducts = await Product.insertMany(productsWithSlugs);
    logger.info(`🛒 Inserted ${insertedProducts.length} products`);

    // Insert coupons
    const insertedCoupons = await Coupon.insertMany(coupons);
    logger.info(`🎫 Inserted ${insertedCoupons.length} coupons`);

    // Create users
    const admin = await User.create(adminUser);
    const customer = await User.create(customerUser);
    logger.info('👥 Created admin and customer users');

    // Create wallets
    const adminWallet = await Wallet.create({
      user: admin._id,
      balance: 5000,
      isActive: true
    });
    const customerWallet = await Wallet.create({
      user: customer._id,
      balance: 1000,
      isActive: true
    });
    logger.info('💰 Wallets created successfully');

    // Summary
    logger.info('\n=== ✅ DATABASE SEEDED SUCCESSFULLY ===');
    logger.info(`📱 Admin: ${adminUser.phone} | Wallet ₹${adminWallet.balance}`);
    logger.info(`📱 Customer: ${customerUser.phone} | Wallet ₹${customerWallet.balance}`);
    logger.info(`📊 Categories: ${insertedCategories.length}`);
    logger.info(`📊 Products: ${insertedProducts.length}`);
    logger.info(`📊 Coupons: ${insertedCoupons.length}`);
    logger.info('\n🎉 Active Coupons:');
    insertedCoupons.forEach(coupon => logger.info(` - ${coupon.code}: ${coupon.description}`));
    logger.info('\n=======================================\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
