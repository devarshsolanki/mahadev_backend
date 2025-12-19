const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const { SUBSCRIPTION_STATUS, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, WALLET_TRANSACTION_TYPES } = require('../config/constants');

class SubscriptionService {
  // Process all due subscriptions
  static async processDueSubscriptions() {
    try {
      logger.info('🔄 Starting subscription processing cycle...');

      // Find all active subscriptions that are due for delivery
      const dueSubscriptions = await Subscription.find({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        nextDeliveryDate: { $lte: new Date() }
      }).populate('user items.product');

      logger.info(`✅ Found ${dueSubscriptions.length} due subscriptions to process`);

      if (dueSubscriptions.length === 0) {
        return {
          success: true,
          processed: 0,
          failed: 0
        };
      }

      let successCount = 0;
      let failureCount = 0;

      for (const subscription of dueSubscriptions) {
        const result = await this.processSubscription(subscription);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      logger.info(`✨ Subscription processing completed. Success: ${successCount}, Failed: ${failureCount}`);

      return {
        success: true,
        processed: successCount,
        failed: failureCount,
        total: dueSubscriptions.length
      };

    } catch (error) {
      logger.error('❌ Process subscriptions error:', error);
      throw error;
    }
  }

  // Process single subscription and create order
  static async processSubscription(subscription) {
    try {
      logger.info(`📦 Processing subscription: ${subscription.subscriptionId}`);

      // Refresh subscription from DB to ensure latest state
      const freshSubscription = await Subscription.findById(subscription._id)
        .populate('user items.product');

      if (!freshSubscription || freshSubscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        logger.warn(`Subscription ${subscription.subscriptionId} is no longer active`);
        return {
          success: false,
          subscriptionId: subscription.subscriptionId,
          error: 'Subscription is not active'
        };
      }

      // Validate items availability and stock
      const validationErrors = [];
      for (const item of freshSubscription.items) {
        const product = item.product;

        if (!product) {
          validationErrors.push({
            productSnapshot: item.productSnapshot.name,
            error: 'Product not found'
          });
          continue;
        }

        if (product.status !== 'active') {
          validationErrors.push({
            product: product.name,
            error: 'Product is no longer active'
          });
          continue;
        }

        if (product.stock < item.quantity) {
          validationErrors.push({
            product: product.name,
            error: `Insufficient stock. Only ${product.stock} available, need ${item.quantity}`
          });
        }
      }

      // If there are validation errors, record failure and pause if needed
      if (validationErrors.length > 0) {
        freshSubscription.recordFailure();
        await freshSubscription.save();

        logger.warn(`❌ Subscription ${freshSubscription.subscriptionId} failed validation:`, validationErrors);

        return {
          success: false,
          subscriptionId: freshSubscription.subscriptionId,
          errors: validationErrors
        };
      }

      // Check wallet balance if payment method is wallet
      if (freshSubscription.paymentMethod === PAYMENT_METHODS.WALLET) {
        const wallet = await Wallet.findOne({ user: freshSubscription.user._id });

        if (!wallet || wallet.balance < freshSubscription.total) {
          freshSubscription.recordFailure();
          await freshSubscription.save();

          logger.warn(`❌ Subscription ${freshSubscription.subscriptionId}: Insufficient wallet balance (Available: ${wallet?.balance || 0}, Required: ${freshSubscription.total})`);

          return {
            success: false,
            subscriptionId: freshSubscription.subscriptionId,
            error: 'Insufficient wallet balance'
          };
        }
      }

      // Get user and validate delivery address
      const user = await User.findById(freshSubscription.user._id);
      if (!user) {
        freshSubscription.recordFailure();
        await freshSubscription.save();

        logger.error(`❌ Subscription ${freshSubscription.subscriptionId}: User not found`);
        return {
          success: false,
          subscriptionId: freshSubscription.subscriptionId,
          error: 'User not found'
        };
      }

      const deliveryAddress = user.addresses.id(freshSubscription.deliveryAddress);
      if (!deliveryAddress) {
        freshSubscription.recordFailure();
        await freshSubscription.save();

        logger.error(`❌ Subscription ${freshSubscription.subscriptionId}: Delivery address not found`);
        return {
          success: false,
          subscriptionId: freshSubscription.subscriptionId,
          error: 'Delivery address not found'
        };
      }

      // Generate order number
      const orderNumber = await Order.generateOrderNumber();

      // Create order from subscription
      const order = new Order({
        orderNumber,
        user: freshSubscription.user._id,
        items: freshSubscription.items.map(item => ({
          product: item.product._id,
          variantId: item.variantId || null,
          quantity: item.quantity,
          price: item.price,
          productSnapshot: item.productSnapshot
        })),
        subtotal: freshSubscription.subtotal,
        deliveryFee: freshSubscription.deliveryFee,
        tax: freshSubscription.tax,
        total: freshSubscription.total,
        deliveryAddress: {
          label: deliveryAddress.label,
          fullAddress: deliveryAddress.fullAddress,
          landmark: deliveryAddress.landmark || '',
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
          latitude: deliveryAddress.latitude || null,
          longitude: deliveryAddress.longitude || null
        },
        paymentMethod: freshSubscription.paymentMethod,
        isSubscriptionOrder: true,
        subscriptionId: freshSubscription._id,
        customerNotes: freshSubscription.customerNotes || ''
      });

      // Process payment based on method
      if (freshSubscription.paymentMethod === PAYMENT_METHODS.WALLET) {
        try {
          // Debit wallet
          const wallet = await Wallet.findOne({ user: freshSubscription.user._id });
          wallet.balance -= freshSubscription.total;
          await wallet.save();

          // Create transaction record
          await Transaction.create({
            user: freshSubscription.user._id,
            type: WALLET_TRANSACTION_TYPES.DEBIT,
            amount: freshSubscription.total,
            walletBalance: wallet.balance,
            description: `Subscription order ${orderNumber}`,
            orderId: order._id,
            status: 'completed'
          });

          order.paymentStatus = PAYMENT_STATUS.COMPLETED;
          order.paymentDetails = {
            transactionId: `WALLET_SUB_${Date.now()}`,
            paymentGateway: 'wallet',
            paidAt: new Date()
          };
          order.status = ORDER_STATUS.CONFIRMED;
          order.confirmedAt = new Date();

          logger.info(`💳 Wallet payment processed for order ${orderNumber}`);

        } catch (walletError) {
          freshSubscription.recordFailure();
          await freshSubscription.save();

          logger.error(`❌ Subscription ${freshSubscription.subscriptionId} wallet payment failed:`, walletError);

          return {
            success: false,
            subscriptionId: freshSubscription.subscriptionId,
            error: `Payment failed: ${walletError.message}`
          };
        }
      } else if (freshSubscription.paymentMethod === PAYMENT_METHODS.COD) {
        // Cash on delivery
        order.paymentStatus = PAYMENT_STATUS.PENDING;
        order.status = ORDER_STATUS.CONFIRMED;
        order.confirmedAt = new Date();

        logger.info(`📮 COD order created: ${orderNumber}`);
      }

      // Save order
      await order.save();

      // Decrease product stock for each item
      for (const item of freshSubscription.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock -= item.quantity;
          if (product.stock < 0) product.stock = 0;
          await product.save();
        }
      }

      // Record success and update next delivery date
      freshSubscription.recordSuccess(freshSubscription.total);
      await freshSubscription.save();

      logger.info(`✅ Subscription ${freshSubscription.subscriptionId} processed successfully. Order: ${orderNumber}, Next Delivery: ${freshSubscription.nextDeliveryDate.toISOString()}`);

      return {
        success: true,
        subscriptionId: freshSubscription.subscriptionId,
        orderNumber,
        nextDeliveryDate: freshSubscription.nextDeliveryDate
      };

    } catch (error) {
      logger.error(`❌ Process subscription error:`, error);

      if (subscription && subscription._id) {
        try {
          const sub = await Subscription.findById(subscription._id);
          if (sub) {
            sub.recordFailure();
            await sub.save();
          }
        } catch (saveError) {
          logger.error('Failed to record subscription failure:', saveError);
        }
      }

      return {
        success: false,
        subscriptionId: subscription?.subscriptionId || 'unknown',
        error: error.message
      };
    }
  }

  // Check and resume paused subscriptions based on resumeDate
  static async checkPausedSubscriptions() {
    try {
      const now = new Date();

      // Find paused subscriptions with resume date
      const subscriptionsToResume = await Subscription.find({
        status: SUBSCRIPTION_STATUS.PAUSED,
        resumeDate: { $lte: now }
      });

      logger.info(`🔄 Found ${subscriptionsToResume.length} subscriptions to resume`);

      for (const subscription of subscriptionsToResume) {
        subscription.resume();
        await subscription.save();

        logger.info(`✅ Resumed subscription: ${subscription.subscriptionId}`);
      }

      return {
        success: true,
        resumed: subscriptionsToResume.length
      };

    } catch (error) {
      logger.error('❌ Check paused subscriptions error:', error);
      throw error;
    }
  }

  // Get upcoming deliveries in next N days
  static async getUpcomingDeliveries(days = 7) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);
      endDate.setHours(23, 59, 59, 999);

      const upcomingSubscriptions = await Subscription.find({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        nextDeliveryDate: {
          $gte: today,
          $lte: endDate
        }
      })
        .populate('user', 'name phone email')
        .populate('items.product', 'name stock price')
        .sort({ nextDeliveryDate: 1 });

      logger.info(`📅 Found ${upcomingSubscriptions.length} deliveries in next ${days} days`);

      return upcomingSubscriptions;

    } catch (error) {
      logger.error('❌ Get upcoming deliveries error:', error);
      throw error;
    }
  }

  // Send reminder notifications for subscriptions due in 24 hours
  static async sendReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find subscriptions due between now and 24 hours from now
      const subscriptions = await Subscription.find({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        nextDeliveryDate: {
          $gte: now,
          $lte: tomorrow
        }
      }).populate('user', 'name phone email').populate('items.product', 'name price');

      logger.info(`📧 Sending reminders for ${subscriptions.length} subscriptions`);

      for (const subscription of subscriptions) {
        try {
          // TODO: Integrate with notification service (email/SMS/push)
          logger.info(`📬 Reminder sent for subscription: ${subscription.subscriptionId} to ${subscription.user.phone}`);
        } catch (error) {
          logger.warn(`Failed to send reminder for ${subscription.subscriptionId}:`, error);
        }
      }

      return {
        success: true,
        remindersSent: subscriptions.length
      };

    } catch (error) {
      logger.error('❌ Send reminders error:', error);
      throw error;
    }
  }

  // Get subscription analytics for a user
  static async getUserAnalytics(userId) {
    try {
      const subscriptions = await Subscription.find({ user: userId });

      if (subscriptions.length === 0) {
        return {
          totalSubscriptions: 0,
          activeCount: 0,
          pausedCount: 0,
          cancelledCount: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          mostFrequentFrequency: null
        };
      }

      const stats = {
        totalSubscriptions: subscriptions.length,
        activeCount: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.ACTIVE).length,
        pausedCount: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.PAUSED).length,
        cancelledCount: subscriptions.filter(s => s.status === SUBSCRIPTION_STATUS.CANCELLED).length,
        totalSpent: subscriptions.reduce((sum, s) => sum + s.totalSpent, 0),
        averageOrderValue: subscriptions.reduce((sum, s) => sum + s.total, 0) / subscriptions.length,
        totalOrders: subscriptions.reduce((sum, s) => sum + s.totalOrders, 0),
        frequencyBreakdown: {
          daily: subscriptions.filter(s => s.frequency === 'daily').length,
          weekly: subscriptions.filter(s => s.frequency === 'weekly').length,
          monthly: subscriptions.filter(s => s.frequency === 'monthly').length
        }
      };

      return stats;

    } catch (error) {
      logger.error('❌ Get user analytics error:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;