const Category = require('../models/Category');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { STATUS_CODES } = require('../config/constants');

class CategoryController {
  static async getCategoryNodeAndDescendantIds(categoryId) {
    const rawId = categoryId && categoryId.toString ? categoryId.toString() : categoryId;
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
      return [];
    }

    const nodeId = new mongoose.Types.ObjectId(rawId);
    const agg = await Category.aggregate([
      { $match: { _id: nodeId } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentCategory',
          as: 'descendants'
        }
      },
      {
        $project: {
          ids: {
            $concatArrays: [
              ['$_id'],
              { $map: { input: '$descendants', as: 'd', in: '$$d._id' } }
            ]
          }
        }
      }
    ]);

    if (!agg.length || !Array.isArray(agg[0].ids) || !agg[0].ids.length) {
      return [nodeId];
    }

    return agg[0].ids;
  }

  // Get all categories
  static async getCategories(req, res) {
    try {
      const { parentCategory, level, isActive = true } = req.query;

      const filter = {};
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (parentCategory) {
        filter.parentCategory = parentCategory === 'null' ? null : parentCategory;
      }
      if (level !== undefined) filter.level = parseInt(level);

      const categories = await Category.find(filter)
        .populate('parentCategory', 'name slug')
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: categories
      });

    } catch (error) {
      logger.error('Get categories error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree(req, res) {
    try {
      // Get all active categories
      const categories = await Category.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      // Build tree structure
      const buildTree = (parentId = null) => {
        return categories
          .filter(cat => {
            if (parentId === null) return cat.parentCategory === null;
            return cat.parentCategory && cat.parentCategory.toString() === parentId.toString();
          })
          .map(cat => ({
            ...cat,
            children: buildTree(cat._id)
          }));
      };

      const tree = buildTree();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: tree
      });

    } catch (error) {
      logger.error('Get category tree error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch category tree'
      });
    }
  }

  // Get single category
  static async getCategory(req, res) {
    try {
      const { identifier } = req.params;

      const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: identifier } : { slug: identifier };

      const category = await Category.findOne(query)
        .populate('parentCategory', 'name slug');

      if (!category) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Get subcategories
      const subcategories = await Category.find({
        parentCategory: category._id,
        isActive: true
      }).sort({ displayOrder: 1, name: 1 });

      // Get product count for this category + all descendants.
      const categoryIds = await CategoryController.getCategoryNodeAndDescendantIds(category._id);
      const productCount = await Product.countDocuments({
        status: 'active',
        $or: [
          { category: { $in: categoryIds } },
          { subcategory: { $in: categoryIds } }
        ]
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          ...category.toObject(),
          subcategories,
          productCount
        }
      });

    } catch (error) {
      logger.error('Get category error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch category'
      });
    }
  }

  // Create category (Admin only)
  static async createCategory(req, res) {
    try {
      const categoryData = req.body;

      // Validate parent category if provided
      if (categoryData.parentCategory) {
        const parent = await Category.findById(categoryData.parentCategory);
        if (!parent) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Invalid parent category'
          });
        }
        // Set level based on parent
        categoryData.level = parent.level + 1;
      }

      const category = await Category.create(categoryData);

      logger.info(`Category created: ${category._id}`);

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } catch (error) {
      logger.error('Create category error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create category'
      });
    }
  }

  // Update category (Admin only)
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate parent category if being updated
      if (updates.parentCategory) {
        const parent = await Category.findById(updates.parentCategory);
        if (!parent) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: 'Invalid parent category'
          });
        }
        updates.level = parent.level + 1;
      }

      const category = await Category.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).populate('parentCategory');

      if (!category) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Category not found'
        });
      }

      logger.info(`Category updated: ${category._id}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });

    } catch (error) {
      logger.error('Update category error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to update category'
      });
    }
  }

  // Delete category (Admin only)
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Check if category has products
      const productCount = await Product.countDocuments({ category: id });
      if (productCount > 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Cannot delete category with ${productCount} products. Move or delete products first.`
        });
      }

      // Check if category has subcategories
      const subcategoryCount = await Category.countDocuments({ parentCategory: id });
      if (subcategoryCount > 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Cannot delete category with ${subcategoryCount} subcategories. Delete subcategories first.`
        });
      }

      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Category not found'
        });
      }

      logger.info(`Category deleted: ${id}`);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Category deleted successfully'
      });

    } catch (error) {
      logger.error('Delete category error:', error);
      return res.status(STATUS_CODES.SERVER_ERROR).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  }
}

module.exports = CategoryController;
