const Review = require('../models/Review');
const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * Recalculate and persist averageRating + totalReviews on the Product document.
 * Uses MongoDB aggregation for accuracy.
 */
const recalculateProductRating = async (productId) => {
  const result = await Review.aggregate([
    { $match: { productId: new (require('mongoose').Types.ObjectId)(productId) } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const update =
    result.length > 0
      ? {
          averageRating: Math.round(result[0].averageRating * 10) / 10, // 1 decimal
          totalReviews: result[0].totalReviews,
        }
      : { averageRating: 0, totalReviews: 0 };

  await Product.findByIdAndUpdate(productId, update);
};

/* ─────────────────────────────────────────────
   POST /api/v1/reviews/:productId
   Add or update own review (auth required)
───────────────────────────────────────────── */
const addOrUpdateReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    const { rating, comment } = req.body;

    // Validate rating presence
    if (rating === undefined || rating === null) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Upsert: if user already reviewed this product, update; otherwise create
    const review = await Review.findOneAndUpdate(
      { productId, userId },
      { rating: ratingNum, comment: comment?.trim() || undefined },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Recalculate product rating
    await recalculateProductRating(productId);

    const statusCode = review.__v === undefined ? 200 : 201; // upsert doesn't expose created easily
    // Safer: just return 200 always (upsert semantics)
    return res.status(200).json({
      success: true,
      message: 'Review saved successfully',
      data: review,
    });
  } catch (error) {
    logger.error('addOrUpdateReview error:', error);

    // Duplicate key fallback (shouldn't happen with findOneAndUpdate but just in case)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'You have already reviewed this product' });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ─────────────────────────────────────────────
   GET /api/v1/reviews/:productId
   Get paginated reviews for a product (public)
───────────────────────────────────────────── */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Check product exists
    const product = await Product.findById(productId).select(
      'name averageRating totalReviews'
    );
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const [reviews, total] = await Promise.all([
      Review.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name profilePicture'),
      Review.countDocuments({ productId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          averageRating: product.averageRating,
          totalReviews: product.totalReviews,
        },
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('getProductReviews error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ─────────────────────────────────────────────
   DELETE /api/v1/reviews/:productId
   Delete own review (auth required)
───────────────────────────────────────────── */
const deleteReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    const review = await Review.findOneAndDelete({ productId, userId });

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: 'Review not found or not owned by you' });
    }

    // Recalculate product rating after deletion
    await recalculateProductRating(productId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('deleteReview error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { addOrUpdateReview, getProductReviews, deleteReview };
