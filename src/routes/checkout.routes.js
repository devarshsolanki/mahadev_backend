const express = require('express');
const { body, query } = require('express-validator');
const CheckoutController = require('../controllers/checkoutController');
const { authenticate } = require('../middleware/auth.middleware');
const { PAYMENT_METHODS } = require('../config/constants');
const validate = require('../middleware/validator');

const router = express.Router();

// All checkout routes require authentication
router.use(authenticate);

// Validation rules
const createOrderValidation = [
  body('deliveryAddressId').isMongoId().withMessage('Valid delivery address ID is required'),
  body('paymentMethod').isIn(Object.values(PAYMENT_METHODS)).withMessage('Invalid payment method'),
  body('deliverySlot').optional().isObject().withMessage('Delivery slot must be an object'),
  body('customerNotes').optional().trim()
];

const verifyPaymentValidation = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('transactionId').trim().notEmpty().withMessage('Transaction ID is required'),
  body('paymentGateway').trim().notEmpty().withMessage('Payment gateway is required')
];

// Routes
router.post('/create-order', createOrderValidation, validate, CheckoutController.createOrder);
router.get('/delivery-fee', CheckoutController.getDeliveryFee);
router.get('/delivery-slots', CheckoutController.getDeliverySlots);
router.post('/verify-payment', verifyPaymentValidation, validate, CheckoutController.verifyPayment);

module.exports = router;