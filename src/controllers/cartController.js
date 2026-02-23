const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');
const { STATUS_CODES, PRODUCT_STATUS } = require('../config/constants');

class CartController {
  /**
   * Safely get or create a cart for a user.
   * Handles race conditions and ensures exactly one active cart per user.
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} Cart document or null if creation completely fails
   */
  static async getOrCreateCart(userId) {
    // Step 1: Try to find existing active cart
    let cart = await Cart.findOne({ user: userId, isActive: true });
    if (cart) {
      return cart;
    }

    // Step 2: No active cart found, attempt to create one
    try {
      cart = await Cart.create({
        user: userId,
        items: [],
        isActive: true
      });
      return cart;
    } catch (err) {
      // Step 3: If E11000 error (duplicate), another request created it first
      // Retry finding it (with exponential backoff patience)
      if (err.code === 11000) {
        logger.info(`Cart creation race condition for user ${userId}, retrying fetch...`);
        
        // Retry up to 3 times with small delay
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt))); // 50ms, 100ms, 200ms
          cart = await Cart.findOne({ user: userId, isActive: true });
          if (cart) {
            return cart;
          }
        }
        
        // If still not found after retries, log and return null
        logger.warn(`Cart not found for user ${userId} after concurrent creation attempts`);
        return null;
      }
      
      // For other errors, rethrow
      throw err;
    }
  }

  /**
   * Deactivate any duplicate carts for a user (safety cleanup)
   */
  static async deactivateDuplicateCarts(userId, activeCartId) {
    try {
      await Cart.updateMany(
        { user: userId, _id: { $ne: activeCartId }, isActive: true },
        { isActive: false }
      );
    } catch (err) {
      logger.warn(`Failed to deactivate duplicate carts for user ${userId}:`, err.message);
    }
  }

  // Get user's cart
  static async getCart(req, res) {
    try {
      const userId = req.user.userId;

      // Get or create cart (handles race conditions safely)
      let cart = await this.getOrCreateCart(userId);

      if (!cart) {
        return res.status(STATUS_CODES.SERVER_ERROR).json({
          success: false,
          message: 'Unable to initialize cart. Please try again.'
        });
      }

      // Populate relations
      await cart.populate('items.product', 'name price stock status images');
      await cart.populate('appliedCoupon.couponId', 'code description type value');

      // Deactivate any duplicates (safety cleanup)
      await this.deactivateDuplicateCarts(userId, cart._id);

      // Recalculate totals
      cart.calculateTotals();
      await cart.save();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: cart
      });

    } catch (error) {
      logger.error('Get cart error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch cart'
      });
    }
  }

  // Add item to cart
  static async addToCart(req, res) {
    try {
      const userId = req.user.userId;
      const { productId, quantity = 1, variantId } = req.body;

      // Validate product exists and is available
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (product.status !== PRODUCT_STATUS.ACTIVE) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Product is not available'
        });
      }

      if (product.stock < quantity) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Only ${product.stock} units available`
        });
      }

      // Get or create cart safely (handles race conditions)
      let cart = await this.getOrCreateCart(userId);

      if (!cart) {
        return res.status(STATUS_CODES.SERVER_ERROR).json({
          success: false,
          message: 'Unable to initialize cart. Please try again.'
        });
      }

      // Deactivate any duplicate carts (safety cleanup)
      await this.deactivateDuplicateCarts(userId, cart._id);

      // Add item to cart (handles duplicate product logic)
      cart.addItem(product, quantity, variantId);
      await cart.save();

      // Populate product details in response
      await cart.populate('items.product', 'name price stock status images');

      logger.info(`Item added to cart: ${productId} (qty: ${quantity}) by user: ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Item added to cart',
        data: cart
      });

    } catch (error) {
      logger.error('Add to cart error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to add item to cart'
      });
    }
  }

  // Update cart item quantity
  static async updateCartItem(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;
      const { quantity } = req.body;

      // Validate quantity
      if (quantity < 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid quantity'
        });
      }

      // Get user's cart
      const cart = await Cart.findOne({ user: userId, isActive: true });

      if (!cart) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Find item in cart
      const item = cart.items.id(itemId);
      if (!item) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      // If quantity is 0, remove the item; otherwise validate stock
      if (quantity > 0) {
        const product = await Product.findById(item.product);
        
        if (!product) {
          return res.status(STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: 'Product no longer available'
          });
        }

        if (product.stock < quantity) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Only ${product.stock} units available`
          });
        }
      }

      // Update quantity (0 removes item via method)
      cart.updateItemQuantity(itemId, quantity);
      await cart.save();

      // Populate and return
      await cart.populate('items.product', 'name price stock status images');

      logger.info(`Cart item ${itemId} quantity updated to ${quantity} for user ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
        data: cart
      });

    } catch (error) {
      logger.error('Update cart item error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update cart'
      });
    }
  }

  // Remove item from cart
  static async removeFromCart(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;

      const cart = await Cart.findOne({ user: userId, isActive: true });

      if (!cart) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Verify item exists before removing
      const item = cart.items.id(itemId);
      if (!item) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      cart.removeItem(itemId);
      await cart.save();

      await cart.populate('items.product', 'name price stock status images');

      logger.info(`Item ${itemId} removed from cart for user ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Item removed from cart',
        data: cart
      });

    } catch (error) {
      logger.error('Remove from cart error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to remove item from cart'
      });
    }
  }

  // Clear cart
  static async clearCart(req, res) {
    try {
      const userId = req.user.userId;

      const cart = await Cart.findOne({ user: userId, isActive: true });

      if (!cart) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Cart not found'
        });
      }

      cart.clearCart();
      await cart.save();

      logger.info(`Cart cleared for user ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Cart cleared',
        data: cart
      });

    } catch (error) {
      logger.error('Clear cart error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to clear cart'
      });
    }
  }

  // Apply coupon
  static async applyCoupon(req, res) {
    try {
      const userId = req.user.userId;
      const { couponCode } = req.body;

      const cart = await Cart.findOne({ user: userId, isActive: true })
        .populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      // Find coupon
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Invalid coupon code'
        });
      }

      // Validate coupon
      const validityCheck = coupon.isValid();
      if (!validityCheck.valid) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: validityCheck.message
        });
      }

      // Check minimum cart value
      if (cart.subtotal < coupon.minCartValue) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Minimum cart value of ₹${coupon.minCartValue} required`
        });
      }

      // Check user eligibility (would need order count from Order model)
      // For now, simplified check
      const userEligibility = await coupon.canUserApply(userId, 0);
      if (!userEligibility.canApply) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: userEligibility.message
        });
      }

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(cart.subtotal);

      // Apply coupon
      cart.appliedCoupon = {
        code: coupon.code,
        discountAmount,
        couponId: coupon._id
      };

      cart.calculateTotals();
      await cart.save();

      logger.info(`Coupon applied: ${couponCode} by user: ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Coupon applied successfully',
        data: cart
      });

    } catch (error) {
      logger.error('Apply coupon error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to apply coupon'
      });
    }
  }

  // Remove coupon
  static async removeCoupon(req, res) {
    try {
      const userId = req.user.userId;

      const cart = await Cart.findOne({ user: userId, isActive: true });

      if (!cart) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Cart not found'
        });
      }

      if (!cart.appliedCoupon) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'No coupon applied to this cart'
        });
      }

      cart.appliedCoupon = undefined;
      cart.calculateTotals();
      await cart.save();

      await cart.populate('items.product', 'name price stock status images');

      logger.info(`Coupon removed from cart for user ${userId}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Coupon removed',
        data: cart
      });

    } catch (error) {
      logger.error('Remove coupon error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to remove coupon'
      });
    }
  }

  // Validate cart before checkout
  static async validateCart(req, res) {
    try {
      const userId = req.user.userId;

      const cart = await Cart.findOne({ user: userId, isActive: true })
        .populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      const validationErrors = [];

      // Validate each item
      for (const item of cart.items) {
        const product = item.product;

        // Check if product exists and is active
        if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
          validationErrors.push({
            itemId: item._id,
            productName: item.productSnapshot.name,
            error: 'Product is no longer available'
          });
          continue;
        }

        // Check stock availability
        if (product.stock < item.quantity) {
          validationErrors.push({
            itemId: item._id,
            productName: product.name,
            error: `Only ${product.stock} units available`,
            availableStock: product.stock
          });
        }

        // Check if price changed
        if (product.price !== item.price) {
          validationErrors.push({
            itemId: item._id,
            productName: product.name,
            error: 'Price has changed',
            oldPrice: item.price,
            newPrice: product.price
          });
          
          // Update to new price
          item.price = product.price;
        }
      }

      // Recalculate totals
      cart.calculateTotals();
      await cart.save();

      if (validationErrors.length > 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Cart validation failed',
          errors: validationErrors,
          cart
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Cart is valid',
        data: cart
      });

    } catch (error) {
      logger.error('Validate cart error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to validate cart'
      });
    }
  }
}

module.exports = CartController;