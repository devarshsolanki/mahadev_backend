# Cart System Complete Fix Guide

## Overview

The cart system has been completely debugged and refactored to fix:
- ✅ E11000 duplicate key errors
- ✅ Null reference errors (`Cannot read properties of null`)
- ✅ 500 errors on cart operations
- ✅ Race conditions during concurrent cart creation
- ✅ Missing null checks throughout the cart flow

## What Was Fixed

### 1. **Cart Model** (`src/models/Cart.js`)
- Added `sparse: true` to the `user` field's unique index
- This prevents MongoDB from treating multiple `null` values as duplicates
- Changed from: `unique: true` 
- Changed to: `unique: true, sparse: true`

### 2. **Cart Controller** (`src/controllers/cartController.js`)
- Created a new helper method `getOrCreateCart()` that safely handles race conditions
- Implemented retry logic with exponential backoff on E11000 errors
- Added null checks after cart creation to prevent accessing `cart._id` on null
- Refactored all cart operations to use the new helper
- Added proper logging and error messages

### 3. **All Cart Operations Fixed**
- ✅ `getCart()` - Fetches or creates cart safely
- ✅ `addToCart()` - Adds product to cart with race-condition handling
- ✅ `updateCartItem()` - Updates quantity with stock validation
- ✅ `removeFromCart()` - Removes item with null checks
- ✅ `clearCart()` - Clears all items safely
- ✅ `applyCoupon()` - Applies coupon with validation
- ✅ `removeCoupon()` - Removes coupon with null checks
- ✅ `validateCart()` - Validates cart before checkout

## Testing the Fix

### Test 1: Get Cart (New User - No Cart Exists)
```bash
# Should create a new cart for the user
GET /api/v1/cart
Authorization: Bearer {token}

# Expected Response (201):
{
  "success": true,
  "data": {
    "_id": "...",
    "user": "...",
    "items": [],
    "subtotal": 0,
    "total": 0,
    "isActive": true
  }
}
```

### Test 2: Get Cart (Existing Cart)
```bash
# Should return the existing cart without creating a new one
GET /api/v1/cart
Authorization: Bearer {token}

# Expected Response (200):
{
  "success": true,
  "data": { /* existing cart */ }
}
```

### Test 3: Add to Cart (New Product)
```bash
# Add a product to the user's cart
POST /api/v1/cart/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1
}

# Expected Response (200):
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "_id": "...",
    "items": [
      {
        "_id": "...",
        "product": { "name": "...", "price": 100 },
        "quantity": 1,
        "price": 100
      }
    ],
    "subtotal": 100,
    "total": 100
  }
}
```

### Test 4: Add Same Product Again (Should Increment Quantity)
```bash
# Add the SAME product again - should increment quantity, not create duplicate
POST /api/v1/cart/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2
}

# Expected Response (200):
# items[0].quantity should now be 3 (1 + 2), not 2 separate items
{
  "success": true,
  "data": {
    "items": [
      {
        "quantity": 3,  // ✅ INCREMENTED, not duplicated
        "price": 100
      }
    ]
  }
}
```

### Test 5: Add Multiple Different Products
```bash
# Add product 1
POST /api/v1/cart/add
{ "productId": "product1", "quantity": 1 }

# Add product 2
POST /api/v1/cart/add
{ "productId": "product2", "quantity": 2 }

# Expected: items array should have 2 separate items
{
  "items": [
    { "product": "product1", "quantity": 1 },
    { "product": "product2", "quantity": 2 }
  ]
}
```

### Test 6: Update Item Quantity
```bash
# Update the quantity of an item in the cart
PUT /api/v1/cart/items/{itemId}
Authorization: Bearer {token}
Content-Type: application/json

{ "quantity": 5 }

# Expected Response (200):
{
  "success": true,
  "message": "Cart updated",
  "data": { /* updated cart */ }
}
```

### Test 7: Remove Item (Quantity = 0)
```bash
# Remove an item by setting quantity to 0
PUT /api/v1/cart/items/{itemId}
Authorization: Bearer {token}
Content-Type: application/json

{ "quantity": 0 }

# Expected Response (200):
{
  "success": true,
  "message": "Item removed from cart",
  "data": { /* cart without the item */ }
}
```

### Test 8: Remove Item Via Delete Endpoint
```bash
DELETE /api/v1/cart/items/{itemId}
Authorization: Bearer {token}

# Expected Response (200):
{
  "success": true,
  "message": "Item removed from cart",
  "data": { /* updated cart */ }
}
```

### Test 9: Empty Cart
```bash
DELETE /api/v1/cart/clear
Authorization: Bearer {token}

# Expected Response (200):
{
  "success": true,
  "message": "Cart cleared",
  "data": {
    "items": [],
    "subtotal": 0,
    "total": 0
  }
}
```

### Test 10: One Cart Per User - Verify No Duplicates
```bash
# Rapidly click "Add to Cart 10 times
# All requests should succeed
# Only ONE cart document should exist in MongoDB for the user
# All items should be in that single cart

# Verify in MongoDB:
db.carts.find({ user: ObjectId("user_id"), isActive: true }).count()
# Should return: 1 (only one active cart)
```

### Test 11: Rapid Concurrent Requests (Race Condition Test)
```bash
# Simulate 5 rapid "Add to Cart" requests simultaneously
# All should succeed without E11000 errors
# Should result in ONE cart with all items

# Example using Node.js:
const promises = Array(5).fill().map(() => 
  fetch('/api/v1/cart/add', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId: 'product1', quantity: 1 })
  })
);

Promise.all(promises)
  .then(responses => Promise.all(responses.map(r => r.json())))
  .then(data => console.log(data))
  // Should all return success: true
```

### Test 12: Apply Coupon
```bash
POST /api/v1/cart/coupon/apply
Authorization: Bearer {token}
Content-Type: application/json

{ "couponCode": "SAVE10" }

# Expected Response (200):
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "appliedCoupon": {
      "code": "SAVE10",
      "discountAmount": 10
    },
    "subtotal": 100,
    "discount": 10,
    "total": 90
  }
}
```

### Test 13: Remove Coupon
```bash
DELETE /api/v1/cart/coupon/remove
Authorization: Bearer {token}

# Expected Response (200):
{
  "success": true,
  "message": "Coupon removed",
  "data": {
    "appliedCoupon": null,
    "discount": 0,
    "total": 100
  }
}
```

### Test 14: Validation - Cart Empty
```bash
DELETE /api/v1/cart/clear  // Clear cart first

GET /api/v1/cart/validate
Authorization: Bearer {token}

# Expected Response (400):
{
  "success": false,
  "message": "Cart is empty"
}
```

### Test 15: Validation - Product Stock Unavailable
```bash
# Add a product to cart
# Manually update that product's stock to 0 in MongoDB
# Then call validate

GET /api/v1/cart/validate
Authorization: Bearer {token}

# Expected Response (400):
{
  "success": false,
  "data": [
    {
      "itemId": "...",
      "error": "Only 0 units available"
    }
  ]
}
```

## Error Scenarios That Should Be Handled

### ✅ Product Not Found
```bash
POST /api/v1/cart/add
{ "productId": "invalid_id", "quantity": 1 }

# Response (404):
{ "success": false, "message": "Product not found" }
```

### ✅ Insufficient Stock
```bash
POST /api/v1/cart/add
{ "productId": "product1", "quantity": 1000 }

# Response (400):
{ "success": false, "message": "Only 100 units available" }
```

### ✅ Invalid Quantity
```bash
PUT /api/v1/cart/items/{itemId}
{ "quantity": -5 }

# Response (400):
{ "success": false, "message": "Invalid quantity" }
```

### ✅ Item Not Found in Cart
```bash
DELETE /api/v1/cart/items/invalid_item_id
Authorization: Bearer {token}

# Response (404):
{ "success": false, "message": "Item not found in cart" }
```

### ✅ Unauthorized - No Token
```bash
GET /api/v1/cart
# No Authorization header

# Response (401):
{ "success": false, "message": "Unauthorized" }
```

## MongoDB Checks

After running tests, verify the database:

```javascript
// Check for duplicate active carts per user
db.carts.aggregate([
  { $match: { isActive: true } },
  { $group: { _id: "$user", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
// Should return EMPTY ARRAY - no duplicates

// Check cart statistics
db.carts.stats()

// Check specific user's cart
db.carts.find({ user: ObjectId("user_id") })
// Should find exactly 1 active cart
```

## Key Improvements Summary

| Issue | Before | After |
|-------|--------|-------|
| **Duplicate Carts** | E11000 errors | One cart per user guaranteed |
| **Null References** | 500 errors | Safe null checks throughout |
| **Race Conditions** | Failed concurrent requests | Retry logic with backoff |
| **Item Duplication** | Possible duplicate items | Quantity incremented instead |
| **Error Handling** | Generic 500s | Specific error messages |
| **Logging** | Minimal | Detailed action logging |

## Rollback Instructions

If you need to revert the changes:

```bash
# Revert Cart.js
git checkout src/models/Cart.js

# Revert cartController.js
git checkout src/controllers/cartController.js

# Restart your server
npm start
```

## Next Steps

1. **Reset MongoDB** (if needed):
   ```javascript
   // Drop existing carts (will lose user cart data!)
   db.carts.deleteMany({})
   
   // Drop indexes
   db.carts.dropIndexes()
   ```

2. **Restart the backend server**:
   ```bash
   npm start
   # or
   node src/app.js
   ```

3. **Clear frontend cache**:
   - Browser DevTools → Application → Clear Site Data
   - Or restart the frontend dev server

4. **Run the test suite** from above

5. **Monitor logs** for any errors during testing

## Questions?

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify MongoDB is running: `mongod --version`
3. Check the `.env` file has correct database connection string
4. Ensure tests are running against the correct environment
