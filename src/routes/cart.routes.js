const express = require('express');
const { body, param } = require('express-validator');
const CartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Validation rules
const addToCartValidation = [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('variantId').optional().isMongoId().withMessage('Valid variant ID required')
];

const updateCartItemValidation = [
  param('itemId').isMongoId().withMessage('Valid item ID is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative number')
];

const applyCouponValidation = [
  body('couponCode').trim().notEmpty().withMessage('Coupon code is required')
];

// Routes
// Bind methods to preserve 'this' context for static method calls
router.get('/', (req, res) => CartController.getCart(req, res));
router.post('/add', addToCartValidation, validate, (req, res) => CartController.addToCart(req, res));
router.put('/items/:itemId', updateCartItemValidation, validate, (req, res) => CartController.updateCartItem(req, res));
router.delete('/items/:itemId', (req, res) => CartController.removeFromCart(req, res));
router.delete('/clear', (req, res) => CartController.clearCart(req, res));
router.post('/coupon/apply', applyCouponValidation, validate, (req, res) => CartController.applyCoupon(req, res));
router.delete('/coupon/remove', (req, res) => CartController.removeCoupon(req, res));
router.get('/validate', (req, res) => CartController.validateCart(req, res));

module.exports = router;