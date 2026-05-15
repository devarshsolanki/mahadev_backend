const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  addOrUpdateReview,
  getProductReviews,
  deleteReview,
} = require('../controllers/reviewController');

/**
 * @route   POST /api/v1/reviews/:productId
 * @desc    Add or update own review for a product
 * @access  Private (JWT required)
 */
router.post('/:productId', authenticate, addOrUpdateReview);

/**
 * @route   GET /api/v1/reviews/:productId
 * @desc    Get all reviews for a product (paginated, 10/page)
 * @access  Public
 */
router.get('/:productId', getProductReviews);

/**
 * @route   DELETE /api/v1/reviews/:productId
 * @desc    Delete own review for a product
 * @access  Private (JWT required)
 */
router.delete('/:productId', authenticate, deleteReview);

module.exports = router;
