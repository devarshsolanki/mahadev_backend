const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const HomeSlider = require('../models/HomeSlider');
const Category = require('../models/Category');
const Subscription = require('../models/Subscription');
const { STATUS_CODES } = require('../config/constants');
const logger = require('../utils/logger');

class AdminController {
  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      // Get total products count
      const totalProducts = await Product.countDocuments();

      // Get total orders and revenue
      const [totalOrders, revenueResult] = await Promise.all([
        Order.countDocuments(),
        Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
      ]);
      const totalRevenue = revenueResult[0]?.total || 0;
      
      // Get total customers
      const totalCustomers = await User.countDocuments({ role: 'user' });

      // Get low stock products (less than 10 items)
      const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
        .sort({ stock: 1 })
        .limit(5);

      // Get recent orders with user details
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name phone');

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          totalProducts,
          totalOrders,
          totalRevenue,
          totalCustomers,
          lowStockProducts,
          recentOrders,
        },
      });
    } catch (error) {
      logger.error('Error in getDashboardStats:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
      });
    }
  }

  // Get home slider configuration
  static async getHomeSliders(req, res) {
    try {
      const sliders = await HomeSlider.find().sort({ order: 1 }).populate('category', 'name image');
      res.status(STATUS_CODES.OK).json({ success: true, data: sliders });
    } catch (error) {
      logger.error('Error in getHomeSliders:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to fetch home sliders' });
    }
  }

  // Update home slider configuration (replace existing)
  static async updateHomeSliders(req, res) {
    try {
      const { sliders } = req.body;
      if (!Array.isArray(sliders)) {
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }

      // Validate category ids
      const categoryIds = sliders.map((s) => s.categoryId);
      const existing = await Category.find({ _id: { $in: categoryIds } }).select('_id');
      const existingIds = new Set(existing.map((c) => String(c._id)));

      for (const s of sliders) {
        if (!existingIds.has(String(s.categoryId))) {
          return res.status(400).json({ success: false, error: `Category not found: ${s.categoryId}` });
        }
      }

      // Replace configuration
      await HomeSlider.deleteMany({});
      const docs = sliders.map((s) => ({ category: s.categoryId, order: s.order }));
      if (docs.length) await HomeSlider.insertMany(docs);

      const updated = await HomeSlider.find().sort({ order: 1 }).populate('category', 'name image');
      res.status(STATUS_CODES.OK).json({ success: true, data: updated });
    } catch (error) {
      logger.error('Error in updateHomeSliders:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to update home sliders' });
    }
  }

  // Get all active subscriptions (Admin only)
  static async getActiveSubscriptions(req, res) {
    try {
      const subscriptions = await Subscription.find({ status: 'active' })
        .populate('user', 'name phone addresses')
        .populate('items.product', 'name images image price mrp unit discount stock')
        .sort({ nextDeliveryDate: 1 })
        .lean();

      // Format the response to include delivery address details
      const formattedSubscriptions = subscriptions.map(sub => {
        // Find the delivery address from user's addresses
        const deliveryAddress = sub.user?.addresses?.find(
          addr => String(addr._id) === String(sub.deliveryAddress)
        );

        return {
          ...sub,
          deliveryAddressDetails: deliveryAddress || null
        };
      });

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: formattedSubscriptions,
        count: formattedSubscriptions.length
      });
    } catch (error) {
      logger.error('Error in getActiveSubscriptions:', error);
      res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch active subscriptions'
      });
    }
  }
}

module.exports = AdminController;