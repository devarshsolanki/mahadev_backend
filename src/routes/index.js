const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const cartRoutes = require('./cart.routes');
const checkoutRoutes = require('./checkout.routes');
const orderRoutes = require('./order.routes');
const walletRoutes = require('./wallet.routes');
const subscriptionRoutes = require('./subscription.routes');
const adminRoutes = require('./admin.routes');
const homeSliderRoutes = require('./homeSlider.routes');

const router = express.Router();

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount routes
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/products`, productRoutes);
router.use(`/${API_VERSION}/categories`, categoryRoutes);
router.use(`/${API_VERSION}/cart`, cartRoutes);
router.use(`/${API_VERSION}/checkout`, checkoutRoutes);
router.use(`/${API_VERSION}/orders`, orderRoutes);
router.use(`/${API_VERSION}/wallet`, walletRoutes);
router.use(`/${API_VERSION}/subscriptions`, subscriptionRoutes);
router.use(`/${API_VERSION}/home-sliders`, homeSliderRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);

// Future routes will be added here:
// router.use(`/${API_VERSION}/coupons`, couponRoutes);
// router.use(`/${API_VERSION}/reviews`, reviewRoutes);

module.exports = router;