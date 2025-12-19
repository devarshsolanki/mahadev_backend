const express = require('express');
const { body, param, query } = require('express-validator');
const ProductController = require('../controllers/productController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');
const validate = require('../middleware/validator');
const upload = require('../middleware/upload');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a positive number'),
  body('sku').optional().trim().toUpperCase()
];

const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isMongoId().withMessage('Valid category ID is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a positive number')
];

const updateStockValidation = [
  param('id').isMongoId().withMessage('Valid product ID is required'),
  body('stock').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
  body('operation').optional().isIn(['set', 'add', 'subtract']).withMessage('Invalid operation')
];

const idValidation = [
  param('identifier').notEmpty().withMessage('Product ID or slug is required')
];

// Public routes (no auth required)
router.get('/', ProductController.getProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/search', ProductController.searchProducts);
router.get('/:identifier', idValidation, validate, ProductController.getProduct);

// Admin routes (authentication + admin role required)
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  // accept 'image' file in multipart/form-data (optional)
  upload.single('image'),
  createProductValidation,
  validate,
  ProductController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  // accept 'image' file when updating
  upload.single('image'),
  updateProductValidation,
  validate,
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ProductController.deleteProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateStockValidation,
  validate,
  ProductController.updateStock
);

module.exports = router;