const express = require('express');
const { body, param } = require('express-validator');
const CategoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');
const validate = require('../middleware/validator');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  // Treat empty strings as absent so clients can send "" when they mean no value
  body('description').optional({ checkFalsy: true }).trim(),
  body('parentCategory').optional({ checkFalsy: true }).isMongoId().withMessage('Valid parent category ID is required'),
  body('image').optional({ checkFalsy: true }).isURL().withMessage('Valid image URL is required'),
  body('displayOrder').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Display order must be a positive number')
];

const updateCategoryValidation = [
  body('name').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('parentCategory').optional({ checkFalsy: true }).isMongoId().withMessage('Valid parent category ID is required'),
  body('image').optional({ checkFalsy: true }).isURL().withMessage('Valid image URL is required'),
  body('displayOrder').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Display order must be a positive number'),
  // Accept boolean-like values ("true"/"false") as well as actual booleans
  body('isActive').optional({ checkFalsy: true }).isBoolean().withMessage('isActive must be a boolean')
];

const idValidation = [
  param('identifier').notEmpty().withMessage('Category ID or slug is required')
];

// Public routes
router.get('/', CategoryController.getCategories);
router.get('/tree', CategoryController.getCategoryTree);
router.get('/:identifier', idValidation, validate, CategoryController.getCategory);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  createCategoryValidation,
  validate,
  CategoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateCategoryValidation,
  validate,
  CategoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CategoryController.deleteCategory
);

module.exports = router;