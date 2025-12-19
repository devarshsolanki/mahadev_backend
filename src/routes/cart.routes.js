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
router.get('/', CartController.getCart);
router.post('/add', addToCartValidation, validate, CartController.addToCart);
router.put('/items/:itemId', updateCartItemValidation, validate, CartController.updateCartItem);
router.delete('/items/:itemId', CartController.removeFromCart);
router.delete('/clear', CartController.clearCart);
router.post('/coupon/apply', applyCouponValidation, validate, CartController.applyCoupon);
router.delete('/coupon/remove', CartController.removeCoupon);
router.get('/validate', CartController.validateCart);

module.exports = router;