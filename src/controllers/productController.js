const Product = require('../models/Product');
const Category = require('../models/Category');
const logger = require('../utils/logger');
const { STATUS_CODES, PAGINATION, PRODUCT_STATUS } = require('../config/constants');

class ProductController {
  // Get all products with filters and pagination
  static async getProducts(req, res) {
    try {
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
        category,
        subcategory,
        search,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        order = 'desc',
        status = PRODUCT_STATUS.ACTIVE,
        isFeatured,
        inStock
      } = req.query;

      // Build filter query
      const filter = { status };

      if (category) filter.category = category;
      if (subcategory) filter.subcategory = subcategory;
      if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
      if (inStock === 'true') filter.stock = { $gt: 0 };

      // Price range filter
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // Search filter
      if (search) {
        filter.$text = { $search: search };
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
      const skip = (pageNum - 1) * limitNum;

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = order === 'asc' ? 1 : -1;

      // Execute query
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug')
          .populate('subcategory', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(filter)
      ]);

      // Ensure backward-compatibility: if older products have `comparePrice`
      // but don't have `mrp`, map comparePrice -> mrp so frontend always
      // receives `mrp` field.
      const normalized = products.map((p) => {
        if (p.mrp === undefined || p.mrp === null) {
          if (p.comparePrice !== undefined && p.comparePrice !== null) {
            p.mrp = p.comparePrice;
          } else {
            p.mrp = 0;
          }
        }
        // Ensure unit exists
        if (!p.unit) p.unit = '';
        return p;
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: normalized,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Get products error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }
  }

  // Get single product by slug or ID
  static async getProduct(req, res) {
    try {
      const { identifier } = req.params;

      // Check if identifier is ObjectId or slug
      const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: identifier } : { slug: identifier };

      const product = await Product.findOne(query)
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug');

      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Normalize response for frontend expectations
      const prodObj = product.toObject ? product.toObject() : product;
      if (prodObj.mrp === undefined || prodObj.mrp === null) {
        if (prodObj.comparePrice !== undefined && prodObj.comparePrice !== null) {
          prodObj.mrp = prodObj.comparePrice;
        } else {
          prodObj.mrp = 0;
        }
      }
      if (!prodObj.unit) prodObj.unit = prodObj.unit || '';

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: prodObj
      });

    } catch (error) {
      logger.error('Get product error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch product'
      });
    }
  }

  // Create new product (Admin only)
  static async createProduct(req, res) {
    try {
      const productData = { ...req.body };

      // If a file was uploaded, upload it to Cloudinary and attach URL(s)
      if (req.file && req.file.buffer) {
        try {
          const { uploadBuffer } = require('../utils/cloudinary');
          const result = await uploadBuffer(req.file.buffer, req.file.originalname, 'products');
          // Ensure backend product schema expects images as array of objects
          productData.images = [
            { url: result.secure_url || result.url, alt: productData.name || '', isPrimary: true },
          ];
        } catch (err) {
          logger.error('Error uploading image to Cloudinary:', err);
          return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
      }

      // If an external image URL was provided, save it into images array
      if (!productData.images && productData.imageUrl) {
        const imageUrl = productData.imageUrl;
        if (typeof imageUrl === 'string' && imageUrl.trim()) {
          productData.images = [
            { url: imageUrl.trim(), alt: productData.name || '', isPrimary: true }
          ];
          // remove helper field
          delete productData.imageUrl;
        }
      }

      // Verify category exists
      const category = await Category.findById(productData.category);
      if (!category) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid category'
        });
      }

      // Convert numeric fields from strings to numbers if necessary
      if (productData.price !== undefined) productData.price = Number(productData.price);
      if (productData.mrp !== undefined) productData.mrp = Number(productData.mrp);
      if (productData.stock !== undefined) productData.stock = Number(productData.stock);
      if (productData.unit !== undefined) productData.unit = String(productData.unit).trim();

      // Create product
      const product = await Product.create(productData);

      logger.info(`Product created: ${product._id}`);

      const productObj = product.toObject ? product.toObject() : product;
      if (productObj.mrp === undefined || productObj.mrp === null) {
        if (productObj.comparePrice !== undefined && productObj.comparePrice !== null) {
          productObj.mrp = productObj.comparePrice;
        } else {
          productObj.mrp = 0;
        }
      }
      if (!productObj.unit) productObj.unit = '';

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Product created successfully',
        data: productObj
      });

    } catch (error) {
      logger.error('Create product error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create product'
      });
    }
  }

  // Update product (Admin only)
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // If a new image file is uploaded, push/update images array after uploading to Cloudinary
      if (req.file && req.file.buffer) {
        try {
          const { uploadBuffer } = require('../utils/cloudinary');
          const result = await uploadBuffer(req.file.buffer, req.file.originalname, 'products');
          updates.images = updates.images || [];
          // If images is a stringified JSON (form-data), try parse
          if (typeof updates.images === 'string') {
            try { updates.images = JSON.parse(updates.images); } catch (e) { /* keep as array */ }
          }
          updates.images.push({ url: result.secure_url || result.url, alt: updates.name || '', isPrimary: true });
        } catch (err) {
          logger.error('Error uploading image to Cloudinary during update:', err);
          return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
      }

      // If an external image URL is provided in update, append it to images
      if (updates.imageUrl) {
        const imageUrl = updates.imageUrl;
        if (typeof imageUrl === 'string' && imageUrl.trim()) {
          updates.images = updates.images || [];
          // if images is a stringified JSON (form-data) try parse
          if (typeof updates.images === 'string') {
            try { updates.images = JSON.parse(updates.images); } catch (e) { /* leave as is */ }
          }
          updates.images.push({ url: imageUrl.trim(), alt: updates.name || '', isPrimary: true });
          delete updates.imageUrl;
        }
      }

      // Coerce numeric fields if present
      if (updates.price !== undefined) updates.price = Number(updates.price);
      if (updates.mrp !== undefined) updates.mrp = Number(updates.mrp);
      if (updates.stock !== undefined) updates.stock = Number(updates.stock);
      if (updates.unit !== undefined) updates.unit = String(updates.unit).trim();

      // Verify category if being updated
      if (updates.category) {
        const category = await Category.findById(updates.category);
        if (!category) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Invalid category'
          });
        }
      }

      const product = await Product.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).populate('category subcategory');

      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info(`Product updated: ${product._id}`);

      const productObj = product.toObject ? product.toObject() : product;
      if (productObj.mrp === undefined || productObj.mrp === null) {
        if (productObj.comparePrice !== undefined && productObj.comparePrice !== null) {
          productObj.mrp = productObj.comparePrice;
        } else {
          productObj.mrp = 0;
        }
      }
      if (!productObj.unit) productObj.unit = '';

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Product updated successfully',
        data: productObj
      });

    } catch (error) {
      logger.error('Update product error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update product'
      });
    }
  }

  // Delete product (Admin only)
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndDelete(id);

      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info(`Product deleted: ${id}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      logger.error('Delete product error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to delete product'
      });
    }
  }

  // Update product stock (Admin only)
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { stock, operation = 'set' } = req.body;

      if (stock === undefined || stock < 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Valid stock quantity is required'
        });
      }

      const product = await Product.findById(id);

      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Update stock based on operation
      switch (operation) {
        case 'add':
          product.stock += stock;
          break;
        case 'subtract':
          if (product.stock < stock) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: 'Insufficient stock'
            });
          }
          product.stock -= stock;
          break;
        case 'set':
        default:
          product.stock = stock;
      }

      // Update status based on stock
      if (product.stock === 0) {
        product.status = PRODUCT_STATUS.OUT_OF_STOCK;
      } else if (product.status === PRODUCT_STATUS.OUT_OF_STOCK) {
        product.status = PRODUCT_STATUS.ACTIVE;
      }

      await product.save();

      logger.info(`Stock updated for product: ${id}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          productId: product._id,
          stock: product.stock,
          status: product.status
        }
      });

    } catch (error) {
      logger.error('Update stock error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to update stock'
      });
    }
  }

  // Get featured products
  static async getFeaturedProducts(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await Product.find({
        isFeatured: true,
        status: PRODUCT_STATUS.ACTIVE,
        stock: { $gt: 0 }
      })
        .populate('category', 'name slug')
        .sort({ totalSales: -1 })
        .limit(parseInt(limit))
        .lean();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Get featured products error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch featured products'
      });
    }
  }

  // Search products
  static async searchProducts(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const products = await Product.find({
        $text: { $search: q },
        status: PRODUCT_STATUS.ACTIVE
      })
        .select('name slug price comparePrice images category stock')
        .populate('category', 'name slug')
        .limit(parseInt(limit))
        .lean();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: products,
        count: products.length
      });

    } catch (error) {
      logger.error('Search products error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to search products'
      });
    }
  }
}

module.exports = ProductController;