#!/bin/bash

# Test script for Cart & Checkout APIs
BASE_URL="http://localhost:5001/api/v1"

echo "🧪 Testing Cart & Checkout APIs"
echo "================================"
echo ""
echo "⚠️  Make sure you have:"
echo "  1. Run 'npm run seed' to populate database"
echo "  2. Logged in as customer (+919876543210)"
echo "  3. Set TOKEN variable below"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set your auth token here (get it from login response)
TOKEN="YOUR_AUTH_TOKEN_HERE"

if [ "$TOKEN" = "YOUR_AUTH_TOKEN_HERE" ]; then
    echo -e "${RED}❌ Please set your TOKEN variable first!${NC}"
    echo ""
    echo "To get token:"
    echo "1. Send OTP: curl -X POST $BASE_URL/auth/send-otp -d '{\"phone\":\"+919876543210\"}'"
    echo "2. Verify OTP: curl -X POST $BASE_URL/auth/verify-otp -d '{\"phone\":\"+919876543210\",\"otp\":\"YOUR_OTP\",\"name\":\"Test Customer\"}'"
    echo "3. Copy accessToken and paste it in this script"
    exit 1
fi

# Get first product ID
echo -e "${YELLOW}📦 Getting products...${NC}"
PRODUCT_ID=$(curl -s "$BASE_URL/products?limit=1" | jq -r '.data[0]._id')
echo "Product ID: $PRODUCT_ID"
echo ""

# 1. Get Cart (initially empty)
echo -e "${BLUE}1. GET /cart - Get empty cart${NC}"
curl -s -X GET "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 2. Add item to cart
echo -e "${BLUE}2. POST /cart/add - Add item to cart${NC}"
curl -s -X POST "$BASE_URL/cart/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 2}" | jq
echo ""
echo "---"
echo ""

# 3. Get cart with items
echo -e "${BLUE}3. GET /cart - Get cart with items${NC}"
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN")
echo "$CART_RESPONSE" | jq
ITEM_ID=$(echo "$CART_RESPONSE" | jq -r '.data.items[0]._id')
echo ""
echo "---"
echo ""

# 4. Update item quantity
echo -e "${BLUE}4. PUT /cart/items/:itemId - Update quantity${NC}"
curl -s -X PUT "$BASE_URL/cart/items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}' | jq
echo ""
echo "---"
echo ""

# 5. Apply coupon
echo -e "${BLUE}5. POST /cart/coupon/apply - Apply coupon${NC}"
curl -s -X POST "$BASE_URL/cart/coupon/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "WELCOME50"}' | jq
echo ""
echo "---"
echo ""

# 6. Validate cart
echo -e "${BLUE}6. GET /cart/validate - Validate cart${NC}"
curl -s -X GET "$BASE_URL/cart/validate" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 7. Get delivery fee
echo -e "${BLUE}7. GET /checkout/delivery-fee - Get delivery fee${NC}"
curl -s -X GET "$BASE_URL/checkout/delivery-fee?pincode=560001&cartValue=300" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 8. Get delivery slots
echo -e "${BLUE}8. GET /checkout/delivery-slots - Get delivery slots${NC}"
curl -s -X GET "$BASE_URL/checkout/delivery-slots" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 9. Get user profile (to get address ID)
echo -e "${YELLOW}📍 Getting user profile for address...${NC}"
ADDRESS_ID=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.user.addresses[0]._id')
echo "Address ID: $ADDRESS_ID"
echo ""

# 10. Create order
echo -e "${BLUE}9. POST /checkout/create-order - Create order${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/checkout/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deliveryAddressId\": \"$ADDRESS_ID\",
    \"paymentMethod\": \"cod\",
    \"deliverySlot\": {
      \"date\": \"2025-01-15\",
      \"startTime\": \"10:00\",
      \"endTime\": \"12:00\"
    },
    \"customerNotes\": \"Test order from script\"
  }")
echo "$ORDER_RESPONSE" | jq
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data._id')
ORDER_NUMBER=$(echo "$ORDER_RESPONSE" | jq -r '.data.orderNumber')
echo ""
echo "---"
echo ""

# 11. Get my orders
echo -e "${BLUE}10. GET /orders/my-orders - Get order history${NC}"
curl -s -X GET "$BASE_URL/orders/my-orders" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 12. Track order
echo -e "${BLUE}11. GET /orders/:orderId/track - Track order${NC}"
curl -s -X GET "$BASE_URL/orders/$ORDER_ID/track" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo -e "${YELLOW}📊 Summary:${NC}"
echo "  Order Number: $ORDER_NUMBER"
echo "  Order ID: $ORDER_ID"
echo ""
echo "📝 Next steps:"
echo "  - Try cancelling the order: POST /orders/$ORDER_ID/cancel"
echo "  - Add more items and test different coupons"
echo "  - Test with admin token to update order status"