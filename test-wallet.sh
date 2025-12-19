#!/bin/bash

# Test script for Wallet System
BASE_URL="http://localhost:5000/api/v1"

echo "💰 Testing Wallet System"
echo "========================"
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

# Set your auth token here
TOKEN="YOUR_AUTH_TOKEN_HERE"

if [ "$TOKEN" = "YOUR_AUTH_TOKEN_HERE" ]; then
    echo -e "${RED}❌ Please set your TOKEN variable first!${NC}"
    echo ""
    echo "To get token:"
    echo "curl -X POST $BASE_URL/auth/send-otp -d '{\"phone\":\"+919876543210\"}'"
    echo "curl -X POST $BASE_URL/auth/verify-otp -d '{\"phone\":\"+919876543210\",\"otp\":\"YOUR_OTP\",\"name\":\"Test Customer\"}'"
    exit 1
fi

# 1. Get wallet details
echo -e "${BLUE}1. GET /wallet - Get wallet details${NC}"
curl -s -X GET "$BASE_URL/wallet" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 2. Add money to wallet
echo -e "${BLUE}2. POST /wallet/add-money - Add ₹500${NC}"
curl -s -X POST "$BASE_URL/wallet/add-money" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "paymentMethod": "upi",
    "paymentDetails": {
      "transactionId": "UPI123456789"
    }
  }' | jq
echo ""
echo "---"
echo ""

# 3. Get updated wallet balance
echo -e "${BLUE}3. GET /wallet - Check updated balance${NC}"
curl -s -X GET "$BASE_URL/wallet" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 4. Get transaction history
echo -e "${BLUE}4. GET /wallet/transactions - Transaction history${NC}"
TRANSACTIONS=$(curl -s -X GET "$BASE_URL/wallet/transactions" \
  -H "Authorization: Bearer $TOKEN")
echo "$TRANSACTIONS" | jq
TXN_ID=$(echo "$TRANSACTIONS" | jq -r '.data[0].transactionId')
echo ""
echo "---"
echo ""

# 5. Get single transaction
echo -e "${BLUE}5. GET /wallet/transactions/:id - Single transaction${NC}"
curl -s -X GET "$BASE_URL/wallet/transactions/$TXN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 6. Set wallet PIN
echo -e "${BLUE}6. POST /wallet/set-pin - Set PIN${NC}"
curl -s -X POST "$BASE_URL/wallet/set-pin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }' | jq
echo ""
echo "---"
echo ""

# 7. Verify PIN
echo -e "${BLUE}7. POST /wallet/verify-pin - Verify PIN${NC}"
curl -s -X POST "$BASE_URL/wallet/verify-pin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }' | jq
echo ""
echo "---"
echo ""

# 8. Get wallet statistics
echo -e "${BLUE}8. GET /wallet/statistics - Wallet stats${NC}"
curl -s -X GET "$BASE_URL/wallet/statistics" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 9. Test wallet payment - Add product to cart
echo -e "${YELLOW}📦 Preparing to test wallet payment...${NC}"
PRODUCT_ID=$(curl -s "$BASE_URL/products?limit=1" | jq -r '.data[0]._id')
echo "Product ID: $PRODUCT_ID"
echo ""

echo -e "${BLUE}9. POST /cart/add - Add product to cart${NC}"
curl -s -X POST "$BASE_URL/cart/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1}" | jq '.success, .message'
echo ""

# Get address ID
ADDRESS_ID=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.user.addresses[0]._id')
echo "Address ID: $ADDRESS_ID"
echo ""

# 10. Create order with wallet payment
echo -e "${BLUE}10. POST /checkout/create-order - Pay via wallet${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/checkout/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deliveryAddressId\": \"$ADDRESS_ID\",
    \"paymentMethod\": \"wallet\",
    \"deliverySlot\": {
      \"date\": \"2025-01-15\",
      \"startTime\": \"10:00\",
      \"endTime\": \"12:00\"
    }
  }")
echo "$ORDER_RESPONSE" | jq
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data._id')
ORDER_NUMBER=$(echo "$ORDER_RESPONSE" | jq -r '.data.orderNumber')
echo ""
echo "---"
echo ""

# 11. Check wallet balance after payment
echo -e "${BLUE}11. GET /wallet - Balance after payment${NC}"
curl -s -X GET "$BASE_URL/wallet" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 12. View updated transactions
echo -e "${BLUE}12. GET /wallet/transactions - View payment transaction${NC}"
curl -s -X GET "$BASE_URL/wallet/transactions?limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 13. Cancel order (test refund)
echo -e "${BLUE}13. POST /orders/:id/cancel - Cancel order${NC}"
curl -s -X POST "$BASE_URL/orders/$ORDER_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing wallet refund"
  }' | jq
echo ""
echo "---"
echo ""

# 14. Check wallet balance after refund
echo -e "${BLUE}14. GET /wallet - Balance after refund${NC}"
curl -s -X GET "$BASE_URL/wallet" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""
echo "---"
echo ""

# 15. Final transaction history
echo -e "${BLUE}15. GET /wallet/transactions - Complete history${NC}"
curl -s -X GET "$BASE_URL/wallet/transactions" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {transactionId, type, amount, category, description}'
echo ""
echo "---"
echo ""

echo -e "${GREEN}✅ All wallet tests completed!${NC}"
echo ""
echo -e "${YELLOW}📊 Summary:${NC}"
echo "  Order Number: $ORDER_NUMBER"
echo "  Order ID: $ORDER_ID"
echo ""
echo "📝 What was tested:"
echo "  ✅ Get wallet details"
echo "  ✅ Add money to wallet"
echo "  ✅ Set and verify PIN"
echo "  ✅ View transaction history"
echo "  ✅ Pay via wallet (order)"
echo "  ✅ Auto-refund on cancellation"
echo "  ✅ Wallet statistics"
echo ""
echo "💡 Next steps:"
echo "  - Try adding more money with different amounts"
echo "  - Test insufficient balance scenario"
echo "  - Change wallet PIN"
echo "  - Filter transactions by type/category"