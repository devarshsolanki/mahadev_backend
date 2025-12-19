const express = require('express');
const { body, param } = require('express-validator');
const OrderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { USER_ROLES, ORDER_STATUS } = require('../config/constants');
const validate = require('../middleware/validator');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Validation rules
const cancelOrderValidation = [
  param('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('reason').optional().trim()
];

const updateOrderStatusValidation = [
  param('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('status').isIn(Object.values(ORDER_STATUS)).withMessage('Invalid order status'),
  body('deliveryPartnerId').optional().isMongoId().withMessage('Valid delivery partner ID required')
];

// Customer routes
router.get('/my-orders', OrderController.getUserOrders);
router.get('/:orderId', OrderController.getOrder);
router.get('/:orderId/track', OrderController.trackOrder);
router.post('/:orderId/cancel', cancelOrderValidation, validate, OrderController.cancelOrder);

// Admin routes
router.get(
  '/admin/all',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  OrderController.getAllOrders
);

router.put(
  '/admin/:orderId/status',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateOrderStatusValidation,
  validate,
  OrderController.updateOrderStatus
);

module.exports = router;