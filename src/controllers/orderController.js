const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const {
  STATUS_CODES,
  PAGINATION,
  ORDER_STATUS,
  PAYMENT_METHODS,
  WALLET_TRANSACTION_TYPES
} = require('../config/constants');

class OrderController {
  // Get user's orders
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.userId;
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
        status
      } = req.query;

      const filter = { user: userId };
      if (status) filter.status = status;

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('items.product', 'name images')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Order.countDocuments(filter)
      ]);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error('Get user orders error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  }

  // Get single order
  static async getOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;

      const order = await Order.findOne({
        _id: orderId,
        user: userId
      })
        .populate('items.product', 'name images price')
        .populate('deliveryPartner', 'name phone');

      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Get order error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch order'
      });
    }
  }

  // Cancel order
  static async cancelOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await Order.findOne({
        _id: orderId,
        user: userId
      }).populate('items.product');

      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order can be cancelled
      const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      // Update order status
      order.updateStatus(ORDER_STATUS.CANCELLED, userId);
      order.cancellationReason = reason;
      await order.save();

      // Restore product stock
      for (const item of order.items) {
        if (item.product) {
          await item.product.increaseStock(item.quantity);
        }
      }

      // Process refund if payment was completed
      if (order.paymentStatus === 'completed') {
        if (order.paymentMethod === PAYMENT_METHODS.WALLET) {
          // Refund to wallet
          const wallet = await Wallet.findOne({ user: userId });

          if (wallet) {
            const transactionId = await Transaction.generateTransactionId();
            const balanceBefore = wallet.balance;

            wallet.credit(order.total);
            await wallet.save();

            await Transaction.create({
              transactionId,
              user: userId,
              wallet: wallet._id,
              type: WALLET_TRANSACTION_TYPES.REFUND,
              amount: order.total,
              balanceBefore,
              balanceAfter: wallet.balance,
              description: `Refund for cancelled order ${order.orderNumber}`,
              category: 'refund',
              order: order._id,
              status: 'completed',
              completedAt: new Date()
            });

            logger.info(`Refund processed: Order ${order.orderNumber}, Amount: ${order.total}`);
          }
        }
        // For other payment methods, mark for manual refund
        order.paymentStatus = 'refunded';
        await order.save();
      }

      logger.info(`Order cancelled: ${order.orderNumber} by user: ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      logger.error('Cancel order error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to cancel order'
      });
    }
  }

  // Track order
  static async trackOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { orderId } = req.params;

      const order = await Order.findOne({
        _id: orderId,
        user: userId
      })
        .populate('deliveryPartner', 'name phone deliveryPartnerDetails.currentLocation')
        .select(
          'orderNumber status confirmedAt processingAt outForDeliveryAt deliveredAt estimatedDeliveryTime deliveryAddress'
        );

      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Build tracking timeline
      const timeline = [
        {
          status: ORDER_STATUS.PENDING,
          label: 'Order Placed',
          timestamp: order.createdAt,
          completed: true
        },
        {
          status: ORDER_STATUS.CONFIRMED,
          label: 'Order Confirmed',
          timestamp: order.confirmedAt,
          completed: !!order.confirmedAt
        },
        {
          status: ORDER_STATUS.PROCESSING,
          label: 'Preparing Order',
          timestamp: order.processingAt,
          completed: !!order.processingAt
        },
        {
          status: ORDER_STATUS.OUT_FOR_DELIVERY,
          label: 'Out for Delivery',
          timestamp: order.outForDeliveryAt,
          completed: !!order.outForDeliveryAt
        },
        {
          status: ORDER_STATUS.DELIVERED,
          label: 'Delivered',
          timestamp: order.deliveredAt,
          completed: !!order.deliveredAt
        }
      ];

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          orderNumber: order.orderNumber,
          currentStatus: order.status,
          estimatedDelivery: order.estimatedDeliveryTime,
          timeline,
          deliveryPartner: order.deliveryPartner,
          deliveryAddress: order.deliveryAddress
        }
      });
    } catch (error) {
      logger.error('Track order error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to track order'
      });
    }
  }

  // Get all orders (Admin)
  static async getAllOrders(req, res) {
    try {
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
        status,
        search
      } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { orderNumber: new RegExp(search, 'i') },
          { 'deliveryAddress.pincode': search }
        ];
      }

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('user', 'name phone')
          .populate('deliveryPartner', 'name phone')
          .populate('items.product', 'name images')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Order.countDocuments(filter)
      ]);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error('Get all orders error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  }

  // Update order status (Admin)
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, deliveryPartnerId } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Validate status transition
      if (!Object.values(ORDER_STATUS).includes(status)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid order status'
        });
      }

      order.updateStatus(status, req.user.userId);

      // Assign delivery partner if provided
      if (deliveryPartnerId) {
        order.deliveryPartner = deliveryPartnerId;
      }

      await order.save();

      logger.info(`Order status updated: ${order.orderNumber} to ${status}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error) {
      logger.error('Update order status error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
  }
}

module.exports = OrderController;
