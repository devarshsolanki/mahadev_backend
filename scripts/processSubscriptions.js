require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionService = require('../src/services/subscriptionService');
const logger = require('../src/utils/logger');

// Manual script to process subscriptions
const processSubscriptions = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    logger.info('Starting manual subscription processing...');
    
    // Process due subscriptions
    const result = await SubscriptionService.processDueSubscriptions();
    
    logger.info(`\n=== Subscription Processing Complete ===`);
    logger.info(`Processed: ${result.processed} subscriptions`);
    logger.info(`======================================\n`);

    process.exit(0);

  } catch (error) {
    logger.error('Process subscriptions script error:', error);
    process.exit(1);
  }
};

// Run script
processSubscriptions();