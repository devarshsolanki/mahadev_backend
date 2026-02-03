const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Wallet = require('../models/Wallet');
const WalletController = require('./walletController');
const logger = require('../utils/logger');
const { STATUS_CODES, PAYMENT_METHODS, ORDER_STATUS, PRODUCT_STATUS, PAYMENT_STATUS } = require('../config/constants');
const bcrypt = require('bcryptjs');

class CheckoutController {
  // Create order from cart
  static async createOrder(req, res) {
    try {
      const userId = req.user.userId;
      const {
        deliveryAddressId,
        paymentMethod,
        deliverySlot,
        customerNotes,
        walletPIN
      } = req.body;

      // Validate payment method
      if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      // Get cart
      const cart = await Cart.findOne({ user: userId, isActive: true })
        .populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      // Get user and validate delivery address
      const user = await User.findById(userId);
      const deliveryAddress = user.addresses.id(deliveryAddressId);

      if (!deliveryAddress) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid delivery address'
        });
      }

      // Validate cart items and stock
      const validationErrors = [];
      for (const item of cart.items) {
        const product = item.product;

        if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
          validationErrors.push({
            product: item.productSnapshot.name,
            error: 'Product is no longer available'
          });
          continue;
        }

        if (product.stock < item.quantity) {
          validationErrors.push({
            product: product.name,
            error: `Insufficient stock. Only ${product.stock} units available`
          });
        }
      }

      if (validationErrors.length > 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Order validation failed',
          errors: validationErrors
        });
      }

      // If payment method is wallet, check balance and verify PIN
      if (paymentMethod === PAYMENT_METHODS.WALLET) {
        const wallet = await Wallet.findOne({ user: userId }).select('+pin');
        if (!wallet) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Wallet not found'
          });
        }

        if (!wallet.hasSufficientBalance(cart.total)) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Insufficient wallet balance. Available: ₹${wallet.availableBalance}, Required: ₹${cart.total}`
          });
        }

        // Verify wallet PIN
        if (!wallet.isPinSet) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Please set a wallet PIN first'
          });
        }

        if (!walletPIN) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Wallet PIN is required'
          });
        }

        const isPinValid = await bcrypt.compare(walletPIN, wallet.pin);
        if (!isPinValid) {
          return res.status(STATUS_CODES.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid wallet PIN'
          });
        }
      }

      // Generate order number
      const orderNumber = await Order.generateOrderNumber();

      // Create order
      const order = new Order({
        orderNumber,
        user: userId,
        items: cart.items.map(item => ({
          product: item.product._id,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          productSnapshot: item.productSnapshot
        })),
        subtotal: cart.subtotal,
        discount: cart.discount,
        deliveryFee: cart.deliveryFee,
        tax: cart.tax,
        total: cart.total,
        deliveryAddress: {
          label: deliveryAddress.label,
          fullAddress: deliveryAddress.fullAddress,
          landmark: deliveryAddress.landmark,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude
        },
        paymentMethod,
        customerNotes,
        deliverySlot
      });

      // Add coupon details if applied
      if (cart.appliedCoupon) {
        order.coupon = {
          code: cart.appliedCoupon.code,
          discountAmount: cart.appliedCoupon.discountAmount,
          couponId: cart.appliedCoupon.couponId
        };
      }

      // Save order
      await order.save();

      // Process wallet payment if selected
      if (paymentMethod === PAYMENT_METHODS.WALLET) {
        try {
          await WalletController.payFromWallet(
            userId,
            cart.total,
            order._id,
            `Payment for order ${orderNumber}`
          );

          // Update order payment status
          order.paymentStatus = PAYMENT_STATUS.COMPLETED;
          order.paymentDetails = {
            transactionId: `WALLET_${Date.now()}`,
            paymentGateway: 'wallet',
            paidAt: new Date()
          };
          order.status = ORDER_STATUS.CONFIRMED;
          order.confirmedAt = new Date();
          await order.save();

        } catch (walletError) {
          // If wallet payment fails, delete the order
          await order.deleteOne();

          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: walletError.message || 'Wallet payment failed'
          });
        }
      }

      // Decrease product stock
      for (const item of cart.items) {
        await item.product.decreaseStock(item.quantity);
      }

      // Record coupon usage
      if (cart.appliedCoupon && cart.appliedCoupon.couponId && cart.appliedCoupon.discountAmount !== undefined) {
        try {
          await CouponUsage.create({
            coupon: cart.appliedCoupon.couponId,
            user: userId,
            order: order._id,
            discountAmount: cart.appliedCoupon.discountAmount
          });

          // Increment coupon usage count
          await Coupon.findByIdAndUpdate(
            cart.appliedCoupon.couponId,
            { $inc: { usedCount: 1 } }
          );
        } catch (couponError) {
          logger.warn(`Failed to record coupon usage for order ${orderNumber}: ${couponError.message}`);
          // Continue without failing the order - coupon recording is not critical
        }
      }

      // Clear cart
      cart.clearCart();
      cart.isActive = false;
      await cart.save();

      logger.info(`Order created: ${orderNumber} by user: ${userId}, Payment: ${paymentMethod}`);

      // Populate order details for response
      await order.populate('items.product', 'name images');

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Order placed successfully',
        data: order
      });

    } catch (error) {
      logger.error('Create order error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create order'
      });
    }
  }

  // Get delivery fee estimate
  static async getDeliveryFee(req, res) {
    try {
      const { pincode, cartValue } = req.query;

      if (!pincode) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Pincode is required'
        });
      }

      // Simple delivery fee calculation
      // In production, this would be based on distance, pincode serviceability, etc.
      let deliveryFee = 40;

      // Free delivery above certain amount
      if (cartValue && parseFloat(cartValue) >= 500) {
        deliveryFee = 0;
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          pincode,
          deliveryFee,
          estimatedDelivery: '30-45 minutes',
          freeDeliveryThreshold: 500
        }
      });

    } catch (error) {
      logger.error('Get delivery fee error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to calculate delivery fee'
      });
    }
  }

  // Get available delivery slots
  static async getDeliverySlots(req, res) {
    try {
      const { date } = req.query;

      // Generate time slots (simplified)
      const slots = [
        { id: 1, startTime: '08:00', endTime: '10:00', available: true },
        { id: 2, startTime: '10:00', endTime: '12:00', available: true },
        { id: 3, startTime: '12:00', endTime: '14:00', available: true },
        { id: 4, startTime: '14:00', endTime: '16:00', available: true },
        { id: 5, startTime: '16:00', endTime: '18:00', available: true },
        { id: 6, startTime: '18:00', endTime: '20:00', available: false },
        { id: 7, startTime: '20:00', endTime: '22:00', available: true }
      ];

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          date: date || new Date().toISOString().split('T')[0],
          slots
        }
      });

    } catch (error) {
      logger.error('Get delivery slots error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch delivery slots'
      });
    }
  }

  // Verify payment (for online payments)
  static async verifyPayment(req, res) {
    try {
      const { orderId, transactionId, paymentGateway } = req.body;

      // Find order
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Verify payment with payment gateway
      // This is a simplified version - in production, verify with actual gateway

      // Update order payment details
      order.paymentDetails = {
        transactionId,
        paymentGateway,
        paidAt: new Date()
      };
      order.paymentStatus = PAYMENT_STATUS.COMPLETED;
      order.updateStatus(ORDER_STATUS.CONFIRMED);

      await order.save();

      logger.info(`Payment verified for order: ${order.orderNumber}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Payment verified successfully',
        data: order
      });

    } catch (error) {
      logger.error('Verify payment error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to verify payment'
      });
    }
  }
}

module.exports = CheckoutController;