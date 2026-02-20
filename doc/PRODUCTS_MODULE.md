🛍️ Product & Catalog Module Documentation
Overview
Complete product and category management system with filtering, search, and inventory control.

📦 Features Implemented
Category Management
✅ Hierarchical category structure (3 levels deep)
✅ Category tree with parent-child relationships
✅ Slug-based URL-friendly identifiers
✅ Display order for sorting
✅ Active/inactive status
✅ Category icons and images
✅ SEO metadata support
Product Management
✅ Complete product CRUD operations
✅ Multiple product variants support
✅ Stock management (increase/decrease/set)
✅ Price and compare price (for discounts)
✅ Product images (multiple with primary)
✅ Rich product attributes (weight, dimensions, nutrition)
✅ Product tags for better organization
✅ Featured products flag
✅ SKU management
✅ Low stock threshold alerts
Search & Filtering
✅ Full-text search on name, description, tags
✅ Filter by category/subcategory
✅ Price range filtering
✅ Stock availability filter
✅ Featured products filter
✅ Sort by multiple fields (price, rating, sales, date)
✅ Pagination support
Business Features
✅ Discount percentage calculation
✅ Stock status (in_stock/low_stock/out_of_stock)
✅ Product ratings and reviews (schema ready)
✅ Sales tracking
✅ Subscription availability flag
✅ Time-based discounts
🔌 API Endpoints
Categories
Public Endpoints
Method	Endpoint	Description
GET	/api/v1/categories	Get all categories
GET	/api/v1/categories/tree	Get hierarchical category tree
GET	/api/v1/categories/:identifier	Get single category (by ID or slug)
Admin Endpoints (Auth Required)
Method	Endpoint	Description	Role
POST	/api/v1/categories	Create new category	Admin
PUT	/api/v1/categories/:id	Update category	Admin
DELETE	/api/v1/categories/:id	Delete category	Admin
Products
Public Endpoints
Method	Endpoint	Description
GET	/api/v1/products	Get all products (with filters)
GET	/api/v1/products/featured	Get featured products
GET	/api/v1/products/search	Search products
GET	/api/v1/products/:identifier	Get single product (by ID or slug)
Admin Endpoints (Auth Required)
Method	Endpoint	Description	Role
POST	/api/v1/products	Create new product	Admin
PUT	/api/v1/products/:id	Update product	Admin
DELETE	/api/v1/products/:id	Delete product	Admin
PATCH	/api/v1/products/:id/stock	Update product stock	Admin
📝 API Usage Examples
1. Get All Categories
bash
curl -X GET http://localhost:5000/api/v1/categories
Response:

json
{
  "success": true,
  "data": [
    {
      "_id": "abc123",
      "name": "Fruits & Vegetables",
      "slug": "fruits-vegetables",
      "description": "Fresh fruits and vegetables",
      "displayOrder": 1,
      "isActive": true,
      "level": 0
    }
  ]
}
2. Get Category Tree
bash
curl -X GET http://localhost:5000/api/v1/categories/tree
Response:

json
{
  "success": true,
  "data": [
    {
      "_id": "abc123",
      "name": "Fruits & Vegetables",
      "slug": "fruits-vegetables",
      "children": [
        {
          "_id": "def456",
          "name": "Fresh Fruits",
          "slug": "fresh-fruits",
          "parentCategory": "abc123",
          "children": []
        }
      ]
    }
  ]
}
3. Get All Products with Filters
bash
# Basic listing
curl -X GET "http://localhost:5000/api/v1/products"

# With filters
curl -X GET "http://localhost:5000/api/v1/products?category=abc123&minPrice=50&maxPrice=200&page=1&limit=20&sortBy=price&order=asc"

# In stock only
curl -X GET "http://localhost:5000/api/v1/products?inStock=true"

# Featured products in category
curl -X GET "http://localhost:5000/api/v1/products?category=abc123&isFeatured=true"
Query Parameters:

page - Page number (default: 1)
limit - Items per page (default: 20, max: 100)
category - Filter by category ID
  - NOTE: filtering by a parent `category` will also return products in all of its subcategories (recursive).
subcategory - Filter by subcategory ID
search - Full-text search query
minPrice - Minimum price
maxPrice - Maximum price
sortBy - Sort field (price, createdAt, averageRating, totalSales)
order - Sort order (asc, desc)
status - Product status (active, inactive, out_of_stock)
isFeatured - Featured products only (true/false)
inStock - In-stock products only (true/false)
Response:

json
{
  "success": true,
  "data": [
    {
      "_id": "prod123",
      "name": "Fresh Tomatoes",
      "slug": "fresh-tomatoes",
      "description": "Farm fresh red tomatoes",
      "price": 40,
      "comparePrice": 50,
      "stock": 100,
      "category": {
        "_id": "cat123",
        "name": "Vegetables",
        "slug": "vegetables"
      },
      "images": [
        {
          "url": "https://example.com/image.jpg",
          "isPrimary": true
        }
      ],
      "discountPercentage": 20,
      "stockStatus": "in_stock",
      "averageRating": 4.5,
      "totalReviews": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
4. Search Products
bash
curl -X GET "http://localhost:5000/api/v1/products/search?q=tomato&limit=10"
Response:

json
{
  "success": true,
  "data": [
    {
      "_id": "prod123",
      "name": "Fresh Tomatoes",
      "slug": "fresh-tomatoes",
      "price": 40,
      "comparePrice": 50,
      "stock": 100,
      "images": [...],
      "category": {...}
    }
  ],
  "count": 1
}
5. Get Featured Products
bash
curl -X GET "http://localhost:5000/api/v1/products/featured?limit=10"
6. Get Single Product
bash
# By slug
curl -X GET http://localhost:5000/api/v1/products/fresh-tomatoes

# By ID
curl -X GET http://localhost:5000/api/v1/products/507f1f77bcf86cd799439011
Response:

json
{
  "success": true,
  "data": {
    "_id": "prod123",
    "name": "Fresh Tomatoes",
    "slug": "fresh-tomatoes",
    "description": "Farm fresh red tomatoes, rich in vitamins",
    "shortDescription": "Fresh red tomatoes",
    "price": 40,
    "comparePrice": 50,
    "stock": 100,
    "sku": "TOM-001",
    "category": {
      "_id": "cat123",
      "name": "Vegetables",
      "slug": "vegetables"
    },
    "images": [
      {
        "url": "https://example.com/image.jpg",
        "alt": "Fresh Tomatoes",
        "isPrimary": true
      }
    ],
    "weight": {
      "value": 500,
      "unit": "g"
    },
    "tags": ["fresh", "vegetables", "organic"],
    "status": "active",
    "isFeatured": true,
    "isPublished": true,
    "discountPercentage": 20,
    "stockStatus": "in_stock",
    "averageRating": 4.5,
    "totalReviews": 120,
    "totalSales": 450
  }
}
7. Create Product (Admin Only)
bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Mangoes",
    "description": "Sweet and juicy Alphonso mangoes from Maharashtra",
    "shortDescription": "Alphonso mangoes",
    "category": "60d5ec49f1b2c72b8c8e4a1b",
    "price": 200,
    "comparePrice": 250,
    "stock": 50,
    "sku": "MAN-001",
    "weight": {
      "value": 1,
      "unit": "kg"
    },
    "images": [
      {
        "url": "https://example.com/mango.jpg",
        "alt": "Fresh Mangoes",
        "isPrimary": true
      }
    ],
    "tags": ["fresh", "fruits", "seasonal"],
    "isFeatured": true,
    "isSubscriptionAvailable": true
  }'
Response:

json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "newprod123",
    "name": "Fresh Mangoes",
    "slug": "fresh-mangoes",
    ...
  }
}
8. Update Product (Admin Only)
bash
curl -X PUT http://localhost:5000/api/v1/products/prod123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 180,
    "stock": 75,
    "isFeatured": false
  }'
9. Update Product Stock (Admin Only)
bash
# Set stock to specific value
curl -X PATCH http://localhost:5000/api/v1/products/prod123/stock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 100,
    "operation": "set"
  }'

# Add to existing stock
curl -X PATCH http://localhost:5000/api/v1/products/prod123/stock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 50,
    "operation": "add"
  }'

# Subtract from stock
curl -X PATCH http://localhost:5000/api/v1/products/prod123/stock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 10,
    "operation": "subtract"
  }'
Response:

json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "productId": "prod123",
    "stock": 100,
    "status": "active"
  }
}
10. Delete Product (Admin Only)
bash
curl -X DELETE http://localhost:5000/api/v1/products/prod123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
11. Create Category (Admin Only)
bash
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Products",
    "description": "100% certified organic products",
    "displayOrder": 10,
    "image": "https://example.com/organic.jpg"
  }'
12. Create Subcategory (Admin Only)
bash
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Fruits",
    "description": "Fresh organic fruits",
    "parentCategory": "parent_category_id",
    "displayOrder": 1
  }'
🗂️ Database Models
Category Schema
javascript
{
  name: String,              // Required, unique
  slug: String,              // Auto-generated, unique
  description: String,
  image: String,             // URL
  icon: String,              // Icon URL or class
  parentCategory: ObjectId,  // Reference to parent
  level: Number,             // 0-3 (depth in hierarchy)
  isActive: Boolean,         // Default: true
  displayOrder: Number,      // For sorting
  metaTitle: String,         // SEO
  metaDescription: String,   // SEO
  metaKeywords: [String],    // SEO
  createdAt: Date,
  updatedAt: Date
}
Product Schema
javascript
{
  name: String,                    // Required
  slug: String,                    // Auto-generated, unique
  description: String,             // Required
  shortDescription: String,
  category: ObjectId,              // Required, ref to Category
  subcategory: ObjectId,           // Optional, ref to Category
  brand: String,
  
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  
  variants: [{                     // For multi-variant products
    name: String,
    sku: String,
    price: Number,
    comparePrice: Number,
    stock: Number,
    weight: { value: Number, unit: String },
    isDefault: Boolean,
    isAvailable: Boolean
  }],
  
  price: Number,                   // For single variant
  comparePrice: Number,            // For showing discounts
  sku: String,
  stock: Number,
  lowStockThreshold: Number,
  
  weight: {
    value: Number,
    unit: String                   // g, kg, ml, l, pcs
  },
  
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: String                   // cm, inch
  },
  
  tags: [String],
  ingredients: String,
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fat: Number,
    fiber: Number,
    servingSize: String
  },
  
  status: String,                  // active, inactive, out_of_stock
  isPublished: Boolean,
  isFeatured: Boolean,
  isSubscriptionAvailable: Boolean,
  
  averageRating: Number,           // 0-5
  totalReviews: Number,
  totalSales: Number,
  
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  
  discountStartDate: Date,
  discountEndDate: Date,
  
  createdAt: Date,
  updatedAt: Date
}
🔍 Virtual Fields
Products have computed virtual fields:

discountPercentage - Calculated from price and comparePrice
stockStatus - "in_stock", "low_stock", or "out_of_stock"
hasActiveDiscount - Boolean based on discount dates
🎯 Business Logic
Stock Management Rules
Out of Stock: When stock = 0, status automatically changes to out_of_stock
Low Stock: When stock <= lowStockThreshold, stockStatus = "low_stock"
In Stock: When stock > lowStockThreshold, stockStatus = "in_stock"
Price Display
If comparePrice > price, show discount percentage
discountPercentage = ((comparePrice - price) / comparePrice) * 100
Category Hierarchy
Maximum 3 levels deep (level 0, 1, 2)
Cannot delete category with products
Cannot delete category with subcategories
🚀 Quick Start
1. Seed Sample Data
bash
npm run seed
This creates:

5 sample categories
6 sample products
1 admin user
2. Test Endpoints
bash
# Make test script executable
chmod +x test-products.sh

# Run tests
./test-products.sh
3. Login as Admin
bash
# Send OTP
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'

# Verify OTP (check console for OTP in dev mode)
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919999999999",
    "otp": "YOUR_OTP",
    "name": "Admin User"
  }'

# Save the accessToken for admin operations
📊 Database Indexes
Product Indexes
slug (unique)
category + status
Text index on name, description, tags
price
averageRating (descending)
totalSales (descending)
createdAt (descending)
isFeatured + status
Category Indexes
slug (unique)
parentCategory
isActive + displayOrder
🎨 Frontend Integration Tips
Product Listing Page
javascript
// Fetch products with filters
const response = await fetch(
  '/api/v1/products?category=123&minPrice=50&maxPrice=200&page=1&limit=20'
);
const { data, pagination } = await response.json();

// Display products
data.forEach(product => {
  // Show product.name, product.price, product.images[0].url
  // Calculate discount: product.discountPercentage
  // Show stock status: product.stockStatus
});

// Pagination
console.log(`Page ${pagination.page} of ${pagination.pages}`);
Category Navigation
javascript
// Fetch category tree
const response = await fetch('/api/v1/categories/tree');
const { data } = await response.json();

// Build navigation menu recursively
function buildMenu(categories) {
  return categories.map(cat => ({
    name: cat.name,
    url: `/category/${cat.slug}`,
    children: cat.children.length ? buildMenu(cat.children) : []
  }));
}
Search Functionality
javascript
// Real-time search
const searchProducts = async (query) => {
  if (query.length < 2) return [];
  
  const response = await fetch(
    `/api/v1/products/search?q=${encodeURIComponent(query)}&limit=10`
  );
  const { data } = await response.json();
  return data;
};

// Debounce for performance
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchProducts(e.target.value);
  }, 300);
});
🔐 Security & Validation
Input Validation
All fields are validated using express-validator
Price must be positive number
Stock must be non-negative integer
Category/subcategory must be valid MongoDB ObjectIds
SKU is automatically converted to uppercase
Authorization
Public: GET requests for products and categories
Admin Only: POST, PUT, DELETE, PATCH operations
Role-based access control via middleware
📈 Performance Optimization
Implemented
✅ Database indexes on frequently queried fields
✅ Lean queries for list endpoints
✅ Pagination to limit result sets
✅ Field selection (populate only needed fields)
✅ Text indexes for fast search
Recommended
Add Redis caching for frequently accessed products
Implement CDN for product images
Add query result caching with 5-minute TTL
Consider Elasticsearch for advanced search
🐛 Troubleshooting
Issue: "Category not found" when creating product
Solution: Ensure category ID is valid and exists in database

Issue: Text search not working
Solution: Text index is created automatically. Restart server if needed.

Issue: Duplicate key error on SKU
Solution: Each product/variant must have unique SKU

Issue: Cannot delete category
Solution: Remove all products and subcategories first

✅ Testing Checklist
 Create category
 Create subcategory
 Get category tree
 Create product
 Update product
 Update stock (add/subtract/set)
 Delete product
 List products with filters
 Search products
 Get featured products
 Filter by price range
 Filter by category
 Sort products (price, rating, sales)
 Pagination works correctly
📚 Next Module: Cart & Checkout
After testing the Product module, we'll build:

Shopping cart management
Cart persistence
Add/update/remove items
Apply coupons
Calculate totals
Checkout process
Built with ❤️ for QuickCommerce

