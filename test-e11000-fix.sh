#!/bin/bash

# Quick Test Script for Cart API
# Tests the Add to Cart endpoint to verify E11000 fix

echo "🧪 Cart API - E11000 Fix Verification"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5000/api/v1"
TOKEN="YOUR_AUTH_TOKEN_HERE"

echo "⚙️  Configuration:"
echo "   Base URL: $BASE_URL"
echo "   Token: $(echo $TOKEN | head -c 20)..."
echo ""

# Test 1: Get Cart
echo "📝 Test 1: GET /cart (Initialize or get existing cart)"
echo "---"
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$CART_RESPONSE" | jq '.' 2>/dev/null || echo "$CART_RESPONSE"
echo ""
echo "Expected: 200 OK with cart data"
echo ""

# Extract cart ID and product ID for next tests
CART_ID=$(echo "$CART_RESPONSE" | jq -r '.data._id' 2>/dev/null)
FIRST_ITEM_ID=$(echo "$CART_RESPONSE" | jq -r '.data.items[0]._id' 2>/dev/null)

if [ -z "$CART_ID" ] || [ "$CART_ID" = "null" ]; then
  echo -e "${YELLOW}⚠️  Could not extract cart ID. Make sure you have a valid token.${NC}"
  echo "   Set TOKEN environment variable with valid auth token"
  exit 1
fi

echo -e "${GREEN}✅ Cart ID: $CART_ID${NC}"
echo ""

# Test 2: Add Product (rapid test)
echo "📝 Test 2: POST /cart/add (Add product - TEST WITH YOUR ACTUAL PRODUCT ID)"
echo "---"
echo "⚠️  Before running: Replace PRODUCT_ID with an actual product ID from your database"
echo ""
echo "Example command:"
echo "curl -X POST $BASE_URL/cart/add \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"productId\":\"REPLACE_WITH_ACTUAL_PRODUCT_ID\",\"quantity\":1}'"
echo ""

# Test 3: Rapid Concurrent Requests
echo "📝 Test 3: Concurrent Requests (Stress Test)"
echo "---"
echo "This test makes 3 simultaneous requests to test for E11000 errors"
echo ""
echo "Command:"
echo "for i in {1..3}; do"
echo "  curl -X GET $BASE_URL/cart \\"
echo "    -H \"Authorization: Bearer $TOKEN\" &"
echo "done"
echo "wait"
echo ""
echo "Expected: All 3 requests should succeed with 200 OK"
echo ""

# Test 4: Check for Errors
echo "📝 Test 4: Check Backend Logs for E11000 Errors"
echo "---"
echo "Run this command:"
echo "grep -i 'E11000' logs/error.log"
echo ""
echo "Expected output: (nothing - no E11000 errors)"
echo ""

# Verification Checklist
echo "✅ VERIFICATION CHECKLIST"
echo "========================="
echo "□ Cart GET request returns 200 OK"
echo "□ Cart structure has items array"
echo "□ Cart has unique _id"
echo "□ No E11000 errors in logs"
echo "□ Can add products without 500 errors"
echo "□ Concurrent requests don't cause errors"
echo "□ Adding to existing cart works"
echo ""

echo "📊 Summary:"
echo "-----------"
echo "If all tests pass: ✅ E11000 fix is working"
echo "If tests fail: ❌ Check backend logs for errors"
echo ""
