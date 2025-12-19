const express = require('express');
const { body, param, query } = require('express-validator');
const WalletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator');

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

// Validation rules
const addMoneyValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('paymentDetails').optional().isObject()
];

const refundValidation = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('reason').optional().trim()
];

const setPinValidation = [
  body('pin').isLength({ min: 4, max: 6 }).withMessage('PIN must be 4-6 digits'),
  body('oldPin').optional().isLength({ min: 4, max: 6 })
];

const verifyPinValidation = [
  body('pin').isLength({ min: 4, max: 6 }).withMessage('PIN must be 4-6 digits')
];

// Routes
router.get('/', WalletController.getWallet);
router.post('/add-money', addMoneyValidation, validate, WalletController.addMoney);
router.post('/refund', refundValidation, validate, WalletController.refundToWallet);
router.get('/transactions', WalletController.getTransactions);
router.get('/transactions/:transactionId', WalletController.getTransaction);
router.post('/set-pin', setPinValidation, validate, WalletController.setPin);
router.post('/verify-pin', verifyPinValidation, validate, WalletController.verifyPin);
router.get('/statistics', WalletController.getStatistics);

module.exports = router;