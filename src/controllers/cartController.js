const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');
const { STATUS_CODES, PRODUCT_STATUS } = require('../config/constants');

class CartController {
  // Get user's cart
  static async getCart(req, res) {
    try {
      const userId = req.user.userId;

      // Use findOneAndUpdate with upsert to avoid E11000 errors
      let cart = await Cart.findOneAndUpdate(
        { user: userId, isActive: true },
        { $setOnInsert: { items: [], isActive: true } },
        { 
          upsert: true, 
          new: true,
          runValidators: false
        }
      )
        .populate('items.product', 'name price stock status images')
        .populate('appliedCoupon.couponId', 'code description type value');

      // Deactivate any other carts for this user (cleanup old ones)
      await Cart.updateMany(
        { user: userId, _id: { $ne: cart._id } },
        { isActive: false }
      );

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

      // Validate product
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

      // Get or create cart - use atomic upsert to avoid E11000 errors
      let cart = await Cart.findOneAndUpdate(
        { user: userId, isActive: true },
        { $setOnInsert: { items: [], isActive: true } },
        { 
          upsert: true, 
          new: true,
          runValidators: false
        }
      );

      // Deactivate any other carts for this user (cleanup old ones)
      await Cart.updateMany(
        { user: userId, _id: { $ne: cart._id } },
        { isActive: false }
      );

      // Add item to cart
      cart.addItem(product, quantity, variantId);
      await cart.save();

      // Populate and return
      await cart.populate('items.product', 'name price stock status images');

      logger.info(`Item added to cart: ${productId} by user: ${userId}`);

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

      if (quantity < 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid quantity'
        });
      }

      const cart = await Cart.findOne({ user: userId, isActive: true });

      if (!cart) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Find item
      const item = cart.items.id(itemId);
      if (!item) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      // Check stock availability
      const product = await Product.findById(item.product);
      if (quantity > 0 && product.stock < quantity) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Only ${product.stock} units available`
        });
      }

      // Update quantity
      cart.updateItemQuantity(itemId, quantity);
      await cart.save();

      await cart.populate('items.product', 'name price stock status images');

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

      cart.removeItem(itemId);
      await cart.save();

      await cart.populate('items.product', 'name price stock status images');

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

      cart.appliedCoupon = undefined;
      cart.calculateTotals();
      await cart.save();

      await cart.populate('items.product', 'name price stock status images');

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