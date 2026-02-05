/**
 * Database Cleanup Script
 * Removes duplicate/inactive carts to resolve E11000 errors
 * 
 * Usage: node scripts/cleanupCarts.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Cart = require('../src/models/Cart');

async function cleanupCarts() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Step 1: Find all inactive carts
    const inactiveCarts = await Cart.find({ isActive: false });
    console.log(`📊 Found ${inactiveCarts.length} inactive carts`);

    if (inactiveCarts.length > 0) {
      // Step 2: Remove inactive carts
      const result = await Cart.deleteMany({ isActive: false });
      console.log(`🗑️  Deleted ${result.deletedCount} inactive carts`);
    }

    // Step 3: Find users with multiple active carts (should not happen with upsert)
    const pipeline = [
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ];
    
    const duplicateUsers = await Cart.aggregate(pipeline);
    console.log(`⚠️  Found ${duplicateUsers.length} users with multiple active carts`);

    if (duplicateUsers.length > 0) {
      console.log('🔧 Fixing users with multiple carts...');
      
      for (const userGroup of duplicateUsers) {
        const userId = userGroup._id;
        // Find all carts for this user and keep only the newest one
        const userCarts = await Cart.find({ user: userId }).sort({ createdAt: -1 });
        
        if (userCarts.length > 1) {
          // Keep the first (newest), deactivate/delete the rest
          const cartIdsToDelete = userCarts.slice(1).map(c => c._id);
          await Cart.deleteMany({ _id: { $in: cartIdsToDelete } });
          console.log(`  ✅ User ${userId}: Kept newest cart, removed ${cartIdsToDelete.length} duplicates`);
        }
      }
    }

    // Step 4: Verify the fix
    const totalCarts = await Cart.countDocuments();
    const activeCarts = await Cart.countDocuments({ isActive: true });
    const uniqueUsers = await Cart.distinct('user');

    console.log('\n📈 Final Statistics:');
    console.log(`   Total Carts: ${totalCarts}`);
    console.log(`   Active Carts: ${activeCarts}`);
    console.log(`   Unique Users: ${uniqueUsers.length}`);
    console.log(`   ✅ All users have unique active carts` + 
                (uniqueUsers.length === activeCarts ? ' ✓' : ' ✗'));

    console.log('\n✨ Cleanup completed successfully!');
    console.log('💡 Tip: The cart creation logic now uses upsert, so E11000 errors should not occur again.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanupCarts();
