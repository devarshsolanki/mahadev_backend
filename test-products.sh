#!/bin/bash

# Test script for Product & Category APIs
BASE_URL="http://localhost:5000/api/v1"

echo "🧪 Testing Product & Category APIs"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Get all categories
echo -e "${BLUE}1. GET /categories - Fetch all categories${NC}"
curl -s -X GET "$BASE_URL/categories" | jq
echo ""
echo "---"
echo ""

# 2. Get category tree
echo -e "${BLUE}2. GET /categories/tree - Fetch category tree${NC}"
curl -s -X GET "$BASE_URL/categories/tree" | jq
echo ""
echo "---"
echo ""

# 3. Get all products
echo -e "${BLUE}3. GET /products - Fetch all products${NC}"
curl -s -X GET "$BASE_URL/products" | jq
echo ""
echo "---"
echo ""

# 4. Get products with filters
echo -e "${BLUE}4. GET /products?minPrice=50&maxPrice=150 - Filter by price${NC}"
curl -s -X GET "$BASE_URL/products?minPrice=50&maxPrice=150" | jq
echo ""
echo "---"
echo ""

# 5. Get featured products
echo -e "${BLUE}5. GET /products/featured - Fetch featured products${NC}"
curl -s -X GET "$BASE_URL/products/featured" | jq
echo ""
echo "---"
echo ""

# 6. Search products
echo -e "${BLUE}6. GET /products/search?q=rice - Search products${NC}"
curl -s -X GET "$BASE_URL/products/search?q=rice" | jq
echo ""
echo "---"
echo ""

# 7. Get single product (you'll need to replace with actual slug)
echo -e "${BLUE}7. GET /products/:slug - Fetch single product${NC}"
curl -s -X GET "$BASE_URL/products/fresh-tomatoes" | jq
echo ""
echo "---"
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📝 Next steps:"
echo "  - Replace product slugs with actual values from your database"
echo "  - Test admin endpoints with authentication token"
echo "  - Test product creation/update/delete operations"