const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const logger = require('../utils/logger');
const { STATUS_CODES, WALLET_TRANSACTION_TYPES } = require('../config/constants');
const bcrypt = require('bcryptjs');

class WalletController {
  // Get wallet details
  static async getWallet(req, res) {
    try {
      const userId = req.user.userId;

      let wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        // Create wallet if doesn't exist
        wallet = await Wallet.create({ user: userId });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          balance: wallet.balance,
          holdBalance: wallet.holdBalance,
          availableBalance: wallet.availableBalance,
          currency: wallet.currency,
          isPinSet: wallet.isPinSet,
          totalCredited: wallet.totalCredited,
          totalDebited: wallet.totalDebited,
          lastTransactionAt: wallet.lastTransactionAt
        }
      });

    } catch (error) {
      logger.error('Get wallet error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch wallet'
      });
    }
  }

  // Add money to wallet
  static async addMoney(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, paymentMethod, paymentDetails } = req.body;

      if (!amount || amount <= 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Get or create wallet
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = await Wallet.create({ user: userId });
      }

      // Check if wallet is active
      if (!wallet.isActive) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Wallet is inactive'
        });
      }

      // Generate transaction ID
      const transactionId = await Transaction.generateTransactionId();

      // Record balance before transaction
      const balanceBefore = wallet.balance;

      // Add money to wallet
      wallet.credit(amount);
      await wallet.save();

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId,
        user: userId,
        wallet: wallet._id,
        type: WALLET_TRANSACTION_TYPES.CREDIT,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: `Added money to wallet`,
        category: 'add_money',
        paymentGateway: paymentDetails ? {
          name: paymentMethod,
          transactionId: paymentDetails.transactionId,
          status: 'success'
        } : undefined,
        status: 'completed',
        completedAt: new Date()
      });

      logger.info(`Money added to wallet: ${userId}, Amount: ${amount}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Money added successfully',
        data: {
          transactionId: transaction.transactionId,
          amount,
          newBalance: wallet.balance,
          availableBalance: wallet.availableBalance
        }
      });

    } catch (error) {
      logger.error('Add money error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to add money'
      });
    }
  }

  // Pay from wallet (internal use)
  static async payFromWallet(userId, amount, orderId, description = 'Order payment') {
    try {
      const wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive) {
        throw new Error('Wallet is inactive');
      }

      if (!wallet.hasSufficientBalance(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      // Generate transaction ID
      const transactionId = await Transaction.generateTransactionId();

      // Record balance before transaction
      const balanceBefore = wallet.balance;

      // Deduct from wallet
      wallet.debit(amount);
      await wallet.save();

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId,
        user: userId,
        wallet: wallet._id,
        type: WALLET_TRANSACTION_TYPES.DEBIT,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        description,
        category: 'order_payment',
        order: orderId,
        status: 'completed',
        completedAt: new Date()
      });

      logger.info(`Payment from wallet: ${userId}, Amount: ${amount}, Order: ${orderId}`);

      return {
        success: true,
        transactionId: transaction.transactionId,
        newBalance: wallet.balance
      };

    } catch (error) {
      logger.error('Pay from wallet error:', error);
      throw error;
    }
  }

  // Refund to wallet
  static async refundToWallet(req, res) {
    try {
      const userId = req.user.userId;
      const { orderId, amount, reason } = req.body;

      if (!orderId || !amount || amount <= 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Valid order ID and amount are required'
        });
      }

      // Verify order
      const order = await Order.findOne({ _id: orderId, user: userId });
      if (!order) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Get wallet
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Generate transaction ID
      const transactionId = await Transaction.generateTransactionId();

      // Record balance before transaction
      const balanceBefore = wallet.balance;

      // Add refund to wallet
      wallet.credit(amount);
      await wallet.save();

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId,
        user: userId,
        wallet: wallet._id,
        type: WALLET_TRANSACTION_TYPES.REFUND,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: reason || `Refund for order ${order.orderNumber}`,
        category: 'refund',
        order: orderId,
        status: 'completed',
        completedAt: new Date()
      });

      logger.info(`Refund to wallet: ${userId}, Amount: ${amount}, Order: ${orderId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          transactionId: transaction.transactionId,
          amount,
          newBalance: wallet.balance
        }
      });

    } catch (error) {
      logger.error('Refund to wallet error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to process refund'
      });
    }
  }

  // Get transaction history
  static async getTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        page = 1, 
        limit = 20,
        type,
        category,
        startDate,
        endDate
      } = req.query;

      const filter = { user: userId };

      if (type) filter.type = type;
      if (category) filter.category = category;
      
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .populate('order', 'orderNumber status')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Transaction.countDocuments(filter)
      ]);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Get transactions error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch transactions'
      });
    }
  }

  // Get single transaction
  static async getTransaction(req, res) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;

      const transaction = await Transaction.findOne({
        transactionId,
        user: userId
      })
        .populate('order', 'orderNumber status total')
        .populate('reversedTransaction', 'transactionId amount');

      if (!transaction) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: transaction
      });

    } catch (error) {
      logger.error('Get transaction error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch transaction'
      });
    }
  }

  // Set/Update wallet PIN
  static async setPin(req, res) {
    try {
      const userId = req.user.userId;
      const { pin, oldPin } = req.body;

      if (!pin || pin.length < 4 || pin.length > 6) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'PIN must be 4-6 digits'
        });
      }

      const wallet = await Wallet.findOne({ user: userId }).select('+pin');

      if (!wallet) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // If PIN already set, verify old PIN
      if (wallet.isPinSet && oldPin) {
        const isMatch = await bcrypt.compare(oldPin, wallet.pin);
        if (!isMatch) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Invalid old PIN'
          });
        }
      }

      // Hash and set new PIN
      const salt = await bcrypt.genSalt(10);
      wallet.pin = await bcrypt.hash(pin, salt);
      wallet.isPinSet = true;
      await wallet.save();

      logger.info(`Wallet PIN set/updated: ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'PIN set successfully'
      });

    } catch (error) {
      logger.error('Set PIN error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to set PIN'
      });
    }
  }

  // Verify wallet PIN
  static async verifyPin(req, res) {
    try {
      const userId = req.user.userId;
      const { pin } = req.body;

      const wallet = await Wallet.findOne({ user: userId }).select('+pin');

      if (!wallet || !wallet.isPinSet) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'PIN not set'
        });
      }

      const isMatch = await bcrypt.compare(pin, wallet.pin);

      if (!isMatch) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid PIN'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'PIN verified successfully'
      });

    } catch (error) {
      logger.error('Verify PIN error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to verify PIN'
      });
    }
  }

  // Get wallet statistics
  static async getStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Get transaction statistics
      const stats = await Transaction.aggregate([
        { $match: { user: wallet.user } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Get monthly trend
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyTrend = await Transaction.aggregate([
        {
          $match: {
            user: wallet.user,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            credits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
              }
            },
            debits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          currentBalance: wallet.balance,
          availableBalance: wallet.availableBalance,
          totalCredited: wallet.totalCredited,
          totalDebited: wallet.totalDebited,
          categoryStats: stats,
          monthlyTrend
        }
      });

    } catch (error) {
      logger.error('Get statistics error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = WalletController;