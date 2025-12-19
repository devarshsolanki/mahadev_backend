const cron = require('node-cron');
const SubscriptionService = require('../services/subscriptionService');
const logger = require('./logger');

// Setup cron jobs for subscription processing
const setupCronJobs = () => {
  // Process due subscriptions every 15 minutes
  // This catches subscriptions that are due at any time
  cron.schedule('*/15 * * * *', async () => {
    try {
      logger.info('⏰ Cron: Running subscription processing job...');
      const result = await SubscriptionService.processDueSubscriptions();
      logger.info(`✅ Cron: Processed ${result.processed} subscriptions, ${result.failed || 0} failed`);
    } catch (error) {
      logger.error('❌ Cron: Subscription processing error:', error.message);
    }
  });

  // Check and resume paused subscriptions every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('⏰ Cron: Checking paused subscriptions for auto-resume...');
      const result = await SubscriptionService.checkPausedSubscriptions();
      logger.info(`✅ Cron: Resumed ${result.resumed} subscriptions`);
    } catch (error) {
      logger.error('❌ Cron: Pause check error:', error.message);
    }
  });

  // Send reminders for subscriptions due in 24 hours at 7 AM daily
  cron.schedule('0 7 * * *', async () => {
    try {
      logger.info('⏰ Cron: Sending subscription reminders...');
      const result = await SubscriptionService.sendReminders();
      logger.info(`✅ Cron: Sent ${result.remindersSent} reminders`);
    } catch (error) {
      logger.error('❌ Cron: Reminder send error:', error.message);
    }
  });

  logger.info('✨ Cron jobs initialized successfully');
};

module.exports = setupCronJobs;