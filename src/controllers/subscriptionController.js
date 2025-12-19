const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');
const { STATUS_CODES, PAGINATION, SUBSCRIPTION_STATUS, PRODUCT_STATUS, SUBSCRIPTION_FREQUENCY } = require('../config/constants');

class SubscriptionController {
  // Create subscription
  static async createSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const {
        items,
        frequency,
        deliveryTime,
        deliveryDays,
        deliveryDate,
        deliveryAddressId,
        paymentMethod,
        customerNotes,
        startDate
      } = req.body;

      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'At least one item is required'
        });
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.productId || !item.quantity) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Each item must have productId and quantity'
          });
        }
        if (item.quantity < 1) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Quantity must be at least 1'
          });
        }
      }

      // Validate frequency
      if (!Object.values(SUBSCRIPTION_FREQUENCY).includes(frequency)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid frequency'
        });
      }

      // Validate frequency-specific fields
      if (frequency === SUBSCRIPTION_FREQUENCY.WEEKLY && (!deliveryDays || deliveryDays.length === 0)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Delivery days are required for weekly subscriptions'
        });
      }

      if (frequency === SUBSCRIPTION_FREQUENCY.MONTHLY && (!deliveryDate || deliveryDate < 1 || deliveryDate > 31)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Valid delivery date (1-31) is required for monthly subscriptions'
        });
      }

      // Validate delivery time
      if (deliveryTime) {
        if (deliveryTime.hour < 0 || deliveryTime.hour > 23) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Hour must be between 0-23'
          });
        }
        if (deliveryTime.minute < 0 || deliveryTime.minute > 59) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Minute must be between 0-59'
          });
        }
      }

      // Get user and validate address
      const user = await User.findById(userId);
      if (!user) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      const deliveryAddress = user.addresses.id(deliveryAddressId);
      if (!deliveryAddress) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid delivery address'
        });
      }

      // Validate and process items
      const subscriptionItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).lean();

        if (!product) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Product ${item.productId} not found`
          });
        }

        if (product.status !== PRODUCT_STATUS.ACTIVE) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Product "${product.name}" is not available`
          });
        }

        // Get product price (using default price or variant price)
        const productPrice = product.price || 0;

        subscriptionItems.push({
          product: product._id,
          variantId: item.variantId || null,
          quantity: item.quantity,
          price: productPrice,
          productSnapshot: {
            name: product.name,
            image: product.images && product.images[0] ? product.images[0].url : product.image,
            sku: product.sku,
            weight: product.weight || null
          }
        });

        subtotal += productPrice * item.quantity;
      }

      // Generate subscription ID
      const subscriptionId = await Subscription.generateSubscriptionId();

      // Calculate delivery fee and tax
      const deliveryFee = subtotal >= 500 ? 0 : 40;
      const tax = 0; // Simplified - can be updated based on business logic
      const total = subtotal + deliveryFee + tax;

      // Create subscription
      const subscription = new Subscription({
        subscriptionId,
        user: userId,
        items: subscriptionItems,
        frequency,
        deliveryTime: deliveryTime || { hour: 8, minute: 0 },
        deliveryDays: frequency === SUBSCRIPTION_FREQUENCY.WEEKLY ? deliveryDays : null,
        deliveryDate: frequency === SUBSCRIPTION_FREQUENCY.MONTHLY ? deliveryDate : null,
        deliveryAddress: deliveryAddressId,
        subtotal,
        deliveryFee,
        tax,
        total,
        paymentMethod: paymentMethod || 'wallet',
        startDate: startDate ? new Date(startDate) : new Date(),
        customerNotes
      });

      // Calculate and set first delivery date
      subscription.nextDeliveryDate = subscription.calculateNextDeliveryDate(subscription.startDate);

      await subscription.save();

      logger.info(`Subscription created: ${subscriptionId} by user: ${userId}`);

      // Populate for response
      await subscription.populate('items.product', 'name images price');

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });

    } catch (error) {
      logger.error('Create subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create subscription'
      });
    }
  }

  // Get user's subscriptions
  static async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.userId;
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
        status
      } = req.query;

      const filter = { user: userId };
      if (status) {
        if (!Object.values(SUBSCRIPTION_STATUS).includes(status)) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Invalid status filter'
          });
        }
        filter.status = status;
      }

      const pageNum = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
      const limitNum = Math.min(parseInt(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
      const skip = (pageNum - 1) * limitNum;

      const [subscriptions, total] = await Promise.all([
        Subscription.find(filter)
          .populate('items.product', 'name images price stock')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Subscription.countDocuments(filter)
      ]);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: subscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Get user subscriptions error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  }

  // Get single subscription
  static async getSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;

      const subscription = await Subscription.findOne({
        subscriptionId,
        user: userId
      }).populate('items.product', 'name images price stock');

      if (!subscription) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: subscription
      });

    } catch (error) {
      logger.error('Get subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch subscription'
      });
    }
  }

  // Update subscription
  static async updateSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;
      const updates = req.body;

      const subscription = await Subscription.findOne({
        subscriptionId,
        user: userId
      });

      if (!subscription) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Only active subscriptions can be updated
      if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Only active subscriptions can be updated'
        });
      }

      // Update allowed fields
      const allowedUpdates = ['deliveryTime', 'deliveryDays', 'deliveryDate', 'customerNotes'];
      let needsRecalculation = false;

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          if (key === 'deliveryTime' || key === 'deliveryDays' || key === 'deliveryDate') {
            needsRecalculation = true;
          }
          subscription[key] = updates[key];
        }
      });

      // Validate frequency-specific fields after update
      if (subscription.frequency === SUBSCRIPTION_FREQUENCY.WEEKLY) {
        if (!subscription.deliveryDays || subscription.deliveryDays.length === 0) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Delivery days are required for weekly subscriptions'
          });
        }
      }

      if (subscription.frequency === SUBSCRIPTION_FREQUENCY.MONTHLY) {
        if (!subscription.deliveryDate || subscription.deliveryDate < 1 || subscription.deliveryDate > 31) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Valid delivery date (1-31) is required for monthly subscriptions'
          });
        }
      }

      // Recalculate next delivery if schedule changed
      if (needsRecalculation) {
        subscription.nextDeliveryDate = subscription.calculateNextDeliveryDate();
      }

      await subscription.save();

      logger.info(`Subscription updated: ${subscriptionId}`);

      await subscription.populate('items.product', 'name images price stock');

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription
      });

    } catch (error) {
      logger.error('Update subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update subscription'
      });
    }
  }

  // Pause subscription
  static async pauseSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;
      const { reason, resumeDate } = req.body;

      const subscription = await Subscription.findOne({
        subscriptionId,
        user: userId
      });

      if (!subscription) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Only active subscriptions can be paused'
        });
      }

      subscription.pause(reason, resumeDate);
      await subscription.save();

      logger.info(`Subscription paused: ${subscriptionId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Subscription paused successfully',
        data: subscription
      });

    } catch (error) {
      logger.error('Pause subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to pause subscription'
      });
    }
  }

  // Resume subscription
  static async resumeSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;

      const subscription = await Subscription.findOne({
        subscriptionId,
        user: userId
      });

      if (!subscription) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (subscription.status !== SUBSCRIPTION_STATUS.PAUSED) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Only paused subscriptions can be resumed'
        });
      }

      subscription.resume();
      await subscription.save();

      logger.info(`Subscription resumed: ${subscriptionId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Subscription resumed successfully',
        data: subscription
      });

    } catch (error) {
      logger.error('Resume subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to resume subscription'
      });
    }
  }

  // Cancel subscription
  static async cancelSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      const subscription = await Subscription.findOne({
        subscriptionId,
        user: userId
      });

      if (!subscription) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Subscription is already cancelled'
        });
      }

      subscription.cancel(reason);
      await subscription.save();

      logger.info(`Subscription cancelled: ${subscriptionId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription
      });

    } catch (error) {
      logger.error('Cancel subscription error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to cancel subscription'
      });
    }
  }

  // Get subscription statistics
  static async getStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await Subscription.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSpent: { $sum: '$totalSpent' }
          }
        }
      ]);

      const totalSubscriptions = await Subscription.countDocuments({ user: userId });
      const activeSubscriptions = await Subscription.countDocuments({
        user: userId,
        status: SUBSCRIPTION_STATUS.ACTIVE
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          totalSubscriptions,
          activeSubscriptions,
          byStatus: stats
        }
      });

    } catch (error) {
      logger.error('Get subscription statistics error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = SubscriptionController;