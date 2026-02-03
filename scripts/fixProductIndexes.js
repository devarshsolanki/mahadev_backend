/**
 * Migration Script: Fix Product Schema Indexes
 * 
 * Issue: MongoDB E11000 error on variants.sku_1 unique index
 * Root Cause: unique: true on variant SKU in subdocument array causes
 *             duplicate key errors when products have empty variants
 * 
 * Solution: 
 * 1. Drop the problematic unique index on variants.sku
 * 2. Make product-level SKU unique and sparse
 * 3. Variant SKU should be sparse (not required, not unique at subdoc level)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahadev';

async function fixProductIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // List all indexes
    console.log('\n📋 Current indexes on products collection:');
    const indexes = await productsCollection.listIndexes().toArray();
    indexes.forEach((idx, i) => {
      console.log(`  ${i}. ${JSON.stringify(idx.key)}`);
    });

    // Drop the problematic variants.sku unique index if it exists
    console.log('\n🗑️  Checking for problematic variants.sku_1 index...');
    try {
      const variantSkuIndex = indexes.find(idx => 
        idx.key['variants.sku'] === 1 && idx.unique === true
      );
      
      if (variantSkuIndex) {
        console.log('  Found problematic index: variants.sku_1 (unique)');
        await productsCollection.dropIndex('variants.sku_1');
        console.log('  ✅ Dropped variants.sku_1 index');
      } else {
        console.log('  ℹ️  No problematic variants.sku_1 index found');
      }
    } catch (err) {
      if (err.message.includes('index not found')) {
        console.log('  ℹ️  Index does not exist (this is fine)');
      } else {
        console.log('  ⚠️  Error checking index:', err.message);
      }
    }

    // Add product-level SKU unique index (sparse)
    console.log('\n📌 Setting up product-level SKU index...');
    try {
      await productsCollection.createIndex(
        { sku: 1 },
        { unique: true, sparse: true, background: true }
      );
      console.log('  ✅ Created unique sparse index on product-level sku');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ℹ️  Index already exists');
      } else {
        console.log('  ⚠️  Error creating index:', err.message);
      }
    }

    // List updated indexes
    console.log('\n📋 Updated indexes on products collection:');
    const updatedIndexes = await productsCollection.listIndexes().toArray();
    updatedIndexes.forEach((idx, i) => {
      console.log(`  ${i}. ${JSON.stringify(idx.key)} ${idx.unique ? '[UNIQUE]' : ''} ${idx.sparse ? '[SPARSE]' : ''}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Note: You may need to restart the backend server for changes to take effect.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
fixProductIndexes();
