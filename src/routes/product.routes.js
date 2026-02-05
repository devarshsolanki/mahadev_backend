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
  body('price')
    .notEmpty().withMessage('Price is required')
    .custom(val => {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        throw new Error('Valid price is required');
      }
      return true;
    }),
  body('mrp')
    .notEmpty().withMessage('MRP is required')
    .custom(val => {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        throw new Error('Valid MRP is required');
      }
      return true;
    }),
  body('stock')
    .notEmpty().withMessage('Stock is required')
    .custom(val => {
      const num = Number(val);
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        throw new Error('Stock must be a positive whole number');
      }
      return true;
    }),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('isFeatured').optional().custom(val => {
    // Accept 'true', 'false', true, false as valid boolean values
    if (typeof val === 'string') {
      return ['true', 'false'].includes(val.toLowerCase());
    }
    return typeof val === 'boolean';
  }).withMessage('isFeatured must be a boolean value'),
  body('sku').optional().trim().toUpperCase()
];

const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isMongoId().withMessage('Valid category ID is required'),
  body('price').optional().custom(val => {
    if (val === '' || val === null || val === undefined) return true; // Skip if not provided
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Valid price is required');
    }
    return true;
  }),
  body('mrp').optional().custom(val => {
    if (val === '' || val === null || val === undefined) return true; // Skip if not provided
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      throw new Error('MRP must be a positive number');
    }
    return true;
  }),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('stock').optional().custom(val => {
    if (val === '' || val === null || val === undefined) return true; // Skip if not provided
    const num = Number(val);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error('Stock must be a positive whole number');
    }
    return true;
  }),
  body('isFeatured').optional().custom(val => {
    // Accept 'true', 'false', true, false as valid boolean values
    if (typeof val === 'string') {
      return ['true', 'false'].includes(val.toLowerCase());
    }
    return typeof val === 'boolean';
  }).withMessage('isFeatured must be a boolean value')
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