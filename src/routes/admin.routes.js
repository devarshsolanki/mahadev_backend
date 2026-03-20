const express = require('express');
const AdminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');

const router = express.Router();

// Protect all routes - admin only
router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN));

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);
// Home slider settings
router.get('/home-sliders', AdminController.getHomeSliders);
router.post('/home-sliders', AdminController.updateHomeSliders);
// Active subscriptions
router.get('/subscriptions/active', AdminController.getActiveSubscriptions);

module.exports = router;