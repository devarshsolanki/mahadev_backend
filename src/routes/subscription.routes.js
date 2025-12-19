const express = require('express');
const { body, param, query } = require('express-validator');
const SubscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth.middleware');
const { SUBSCRIPTION_FREQUENCY } = require('../config/constants');
const validate = require('../middleware/validator');

const router = express.Router();

// All subscription routes require authentication
router.use(authenticate);

// Validation rules
const createSubscriptionValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('frequency').isIn(Object.values(SUBSCRIPTION_FREQUENCY)).withMessage('Invalid frequency'),
  body('deliveryAddressId').isMongoId().withMessage('Valid delivery address ID is required'),
  body('deliveryTime').optional().isObject(),
  body('deliveryDays').optional().isArray(),
  body('deliveryDate').optional().isInt({ min: 1, max: 31 }),
  body('paymentMethod').optional().isString(),
  body('startDate').optional().isISO8601()
];

const updateSubscriptionValidation = [
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  body('deliveryTime').optional().isObject(),
  body('deliveryDays').optional().isArray(),
  body('deliveryDate').optional().isInt({ min: 1, max: 31 })
];

const pauseSubscriptionValidation = [
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  body('reason').optional().trim(),
  body('resumeDate').optional().isISO8601()
];

const cancelSubscriptionValidation = [
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  body('reason').optional().trim()
];

// Routes
router.post('/', createSubscriptionValidation, validate, SubscriptionController.createSubscription);
router.get('/', SubscriptionController.getUserSubscriptions);
router.get('/statistics', SubscriptionController.getStatistics);
router.get('/:subscriptionId', SubscriptionController.getSubscription);
router.put('/:subscriptionId', updateSubscriptionValidation, validate, SubscriptionController.updateSubscription);
router.post('/:subscriptionId/pause', pauseSubscriptionValidation, validate, SubscriptionController.pauseSubscription);
router.post('/:subscriptionId/resume', SubscriptionController.resumeSubscription);
router.post('/:subscriptionId/cancel', cancelSubscriptionValidation, validate, SubscriptionController.cancelSubscription);

module.exports = router;