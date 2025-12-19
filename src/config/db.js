const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Ensure any conflicting non-sparse email index is dropped so we can create a sparse unique index.
    // This prevents E11000 duplicate key errors when multiple users have no email set.
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: 'users' }).toArray();
      if (collections.length) {
        const indexes = await db.collection('users').indexes();
        const emailIndex = indexes.find(i => i.name === 'email_1');
        if (emailIndex && !emailIndex.sparse) {
          try {
            await db.collection('users').dropIndex('email_1');
            logger.info('Dropped non-sparse email index (email_1) to recreate as sparse unique.');
          } catch (dropErr) {
            logger.warn('Could not drop email_1 index:', dropErr.message || dropErr);
          }
        }
      }

      // Require the User model and ensure indexes are created as defined in the schema
      try {
        require('../models/User');
        // createIndexes will create indexes defined on the schema (including the new sparse unique email index)
        await mongoose.model('User').createIndexes();
        logger.info('Ensured User indexes');
      } catch (idxErr) {
        logger.warn('Error ensuring User indexes:', idxErr.message || idxErr);
      }
      // Dev-only: seed some default categories if none exist so frontend shows demo data
      try {
        if (process.env.NODE_ENV !== 'production') {
          const Category = require('../models/Category');
          const count = await Category.countDocuments();
          if (!count) {
            const demoCategories = [
              { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', description: 'Fresh fruits and vegetables', displayOrder: 1, isActive: true },
              { name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Milk, eggs and dairy products', displayOrder: 2, isActive: true },
              { name: 'Bakery & Snacks', slug: 'bakery-snacks', description: 'Bread, biscuits and snacks', displayOrder: 3, isActive: true }
            ];
            await Category.insertMany(demoCategories);
            logger.info('Inserted demo categories');
          }
        }
      } catch (seedErr) {
        logger.warn('Error seeding demo categories:', seedErr.message || seedErr);
      }
    } catch (err) {
      logger.debug('Error while checking/dropping user indexes:', err);
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;