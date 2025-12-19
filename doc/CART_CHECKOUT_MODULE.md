**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "_id": "order123",
    "orderNumber": "ORD2501150001",
    "user": "user123",
    "items": [...],
    "subtotal": 300,
    "discount": 50,
    "deliveryFee": 40,
    "tax": 0,
    "total": 290,
    "deliveryAddress": {...},
    "paymentMethod": "cod",
    "paymentStatus": "pending",
    "status": "pending",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 11. Get My Orders

```bash
# All orders
curl -X GET http://localhost:5000/api/v1/orders/my-orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:5000/api/v1/orders/my-orders?status=delivered&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order123",
      "orderNumber": "ORD2501150001",
      "status": "delivered",
      "total": 290,
      "deliveredAt": "2025-01-15T12:30:00.000Z",
      "items": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 12. Get Single Order

```bash
curl -X GET http://localhost:5000/api/v1/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order123",
    "orderNumber": "ORD2501150001",
    "user": "user123",
    "items": [
      {
        "product": {
          "_id": "prod123",
          "name": "Fresh Tomatoes",
          "images": [...]
        },
        "quantity": 2,
        "price": 40,
        "productSnapshot": {...}
      }
    ],
    "subtotal": 300,
    "discount": 50,
    "deliveryFee": 40,
    "tax": 0,
    "total": 290,
    "coupon": {
      "code": "WELCOME50",
      "discountAmount": 50
    },
    "deliveryAddress": {
      "label": "home",
      "fullAddress": "123, MG Road, Bangalore",
      "city": "Bangalore",
      "pincode": "560001"
    },
    "paymentMethod": "cod",
    "paymentStatus": "pending",
    "status": "delivered",
    "deliveryPartner": {
      "_id": "partner123",
      "name": "John Doe",
      "phone": "+919999888877"
    },
    "confirmedAt": "2025-01-15T10:05:00.000Z",
    "deliveredAt": "2025-01-15T12:30:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 13. Track Order

```bash
curl -X GET http://localhost:5000/api/v1/orders/ORDER_ID/track \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD2501150001",
    "currentStatus": "out_for_delivery",
    "estimatedDelivery": "2025-01-15T12:00:00.000Z",
    "timeline": [
      {
        "status": "pending",
        "label": "Order Placed",
        "timestamp": "2025-01-15T10:00:00.000Z",
        "completed": true
      },
      {
        "status": "confirmed",
        "label": "Order Confirmed",
        "timestamp": "2025-01-15T10:05:00.000Z",
        "completed": true
      },
      {
        "status": "processing",
        "label": "Preparing Order",
        "timestamp": "2025-01-15T10:30:00.000Z",
        "completed": true
      },
      {
        "status": "out_for_delivery",
        "label": "Out for Delivery",
        "timestamp": "2025-01-15T11:00:00.000Z",
        "completed": true
      },
      {
        "status": "delivered",
        "label": "Delivered",
        "timestamp": null,
        "completed": false
      }
    ],
    "deliveryPartner": {
      "_id": "partner123",
      "name": "John Doe",
      "phone": "+919999888877"
    },
    "deliveryAddress": {...}
  }
}
```

---

### 14. Cancel Order

```bash
curl -X POST http://localhost:5000/api/v1/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Need to change items"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderNumber": "ORD2501150001",
    "status": "cancelled",
    "cancellationReason": "Need to change items",
    "cancelledAt": "2025-01-15T10:10:00.000Z"
  }
}
```

**Error Response (if already shipped):**
```json
{
  "success": false,
  "message": "Order cannot be cancelled at this stage"
}
```

---

### 15. Get All Orders (Admin)

```bash
curl -X GET "http://localhost:5000/api/v1/orders/admin/all?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order123",
      "orderNumber": "ORD2501150001",
      "user": {
        "_id": "user123",
        "name": "Test Customer",
        "phone": "+919876543210"
      },
      "total": 290,
      "status": "pending",
      "paymentMethod": "cod",
      "deliveryAddress": {...},
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 16. Update Order Status (Admin)

```bash
curl -X PUT http://localhost:5000/api/v1/orders/admin/ORDER_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "deliveryPartnerId": "partner123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "orderNumber": "ORD2501150001",
    "status": "confirmed",
    "confirmedAt": "2025-01-15T10:05:00.000Z",
    "deliveryPartner": "partner123"
  }
}
```

---

## 🗂️ Database Models

### Cart Schema

```javascript
{
  user: ObjectId,              // Required, unique, ref to User
  items: [
    {
      product: ObjectId,        // ref to Product
      variantId: ObjectId,      // Optional
      quantity: Number,         // Min: 1
      price: Number,            // Price at time of adding
      productSnapshot: {        // Snapshot of product details
        name: String,
        image: String,
        sku: String,
        weight: { value: Number, unit: String }
      }
    }
  ],
  subtotal: Number,
  discount: Number,
  deliveryFee: Number,
  tax: Number,
  total: Number,
  appliedCoupon: {
    code: String,
    discountAmount: Number,
    couponId: ObjectId
  },
  deliveryAddress: ObjectId,    // ref to User.addresses
  isActive: Boolean,
  expiresAt: Date,              // TTL index - 7 days
  createdAt: Date,
  updatedAt: Date
}
```

### Coupon Schema

```javascript
{
  code: String,                 // Required, unique, uppercase
  description: String,
  type: String,                 // percentage, flat, free_delivery
  value: Number,                // Discount value
  minCartValue: Number,         // Minimum cart value required
  maxDiscountAmount: Number,    // Max discount (for percentage)
  startDate: Date,
  endDate: Date,
  usageLimit: Number,           // Total usage limit
  usageLimitPerUser: Number,    // Per user limit
  usedCount: Number,            // Current usage count
  applicableUsers: [ObjectId],  // Specific users only
  applicableCategories: [ObjectId],
  applicableProducts: [ObjectId],
  isFirstOrderOnly: Boolean,
  isActive: Boolean,
  isPublic: Boolean,
  displayText: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Schema

```javascript
{
  orderNumber: String,          // Unique, auto-generated
  user: ObjectId,               // ref to User
  items: [
    {
      product: ObjectId,
      variantId: ObjectId,
      quantity: Number,
      price: Number,
      productSnapshot: { ... }
    }
  ],
  subtotal: Number,
  discount: Number,
  deliveryFee: Number,
  tax: Number,
  total: Number,
  coupon: {
    code: String,
    discountAmount: Number,
    couponId: ObjectId
  },
  deliveryAddress: {            // Full address snapshot
    label: String,
    fullAddress: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number
  },
  paymentMethod: String,        // wallet, card, upi, cod, netbanking
  paymentStatus: String,        // pending, completed, failed, refunded
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date
  },
  status: String,               // pending, confirmed, processing, 
                                // out_for_delivery, delivered, 
                                // cancelled, returned, refunded
  deliveryPartner: ObjectId,    // ref to User (delivery role)
  confirmedAt: Date,
  processingAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: ObjectId,
  deliverySlot: {
    date: Date,
    startTime: String,
    endTime: String
  },
  estimatedDeliveryTime: Date,
  customerNotes: String,
  internalNotes: String,
  isSubscriptionOrder: Boolean,
  subscriptionId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Business Logic

### Cart Calculations

```javascript
// Subtotal
subtotal = sum of (item.price × item.quantity)

// Discount (from coupon)
if (coupon.type === 'percentage'):
  discount = (subtotal × coupon.value / 100)
  discount = min(discount, coupon.maxDiscountAmount)
else if (coupon.type === 'flat'):
  discount = min(coupon.value, subtotal)
else if (coupon.type === 'free_delivery'):
  discount = 0 (deliveryFee will be 0)

// Taxable amount
taxableAmount = subtotal - discount + deliveryFee

// Tax
tax = taxableAmount × taxRate

// Total
total = subtotal - discount + deliveryFee + tax
```

### Coupon Validation Rules

1. **Coupon must be active**: `isActive = true`
2. **Within date range**: `startDate <= now <= endDate`
3. **Usage limit not exceeded**: `usedCount < usageLimit`
4. **User hasn't exceeded limit**: User usage < `usageLimitPerUser`
5. **Minimum cart value met**: `cartSubtotal >= minCartValue`
6. **First order check**: If `isFirstOrderOnly`, user must have 0 orders
7. **User eligibility**: If `applicableUsers` array is not empty, user must be in list

### Order Number Generation

Format: `ORD{YY}{MM}{DD}{SEQUENCE}`
- YY: Last 2 digits of year
- MM: Month (01-12)
- DD: Day (01-31)
- SEQUENCE: 4-digit daily counter (0001-9999)

Example: `ORD2501150023` = 23rd order on Jan 15, 2025

### Order Status Flow

```
pending → confirmed → processing → out_for_delivery → delivered

            ↓
        cancelled (from pending/confirmed only)
```

### Stock Management

- **On Add to Cart**: No stock deduction (soft reservation)
- **On Order Creation**: Stock deducted from products
- **On Order Cancellation**: Stock restored to products

---

## 🚀 Quick Start

### 1. Seed Database

```bash
npm run seed
```

This creates:
- ✅ 5 Categories
- ✅ 6 Products
- ✅ 4 Active Coupons
- ✅ 1 Admin user (+919999999999)
- ✅ 1 Test customer (+919876543210)

### 2. Login as Customer

```bash
# Send OTP
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP (check console for OTP)
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "YOUR_OTP",
    "name": "Test Customer"
  }'
```

### 3. Complete Checkout Flow

```bash
# 1. Add items to cart
curl -X POST http://localhost:5000/api/v1/cart/add \
  -H "Authorization: Bearer TOKEN" \
  -d '{"productId": "PRODUCT_ID", "quantity": 2}'

# 2. Apply coupon
curl -X POST http://localhost:5000/api/v1/cart/coupon/apply \
  -H "Authorization: Bearer TOKEN" \
  -d '{"couponCode": "WELCOME50"}'

# 3. Validate cart
curl -X GET http://localhost:5000/api/v1/cart/validate \
  -H "Authorization: Bearer TOKEN"

# 4. Create order
curl -X POST http://localhost:5000/api/v1/checkout/create-order \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "deliveryAddressId": "ADDRESS_ID",
    "paymentMethod": "cod"
  }'
```

---

## 🎫 Sample Coupons

| Code | Type | Description | Min Cart | Discount | First Order Only |
|------|------|-------------|----------|----------|------------------|
| WELCOME50 | Flat | ₹50 off | ₹200 | ₹50 | Yes |
| SAVE20 | Percentage | 20% off | ₹500 | 20% (max ₹100) | No |
| FREESHIP | Free Delivery | Free delivery | ₹0 | Free shipping | No |
| MEGA100 | Flat | ₹100 off | ₹1000 | ₹100 | No |

---

## 🔐 Order Status Permissions

| Status | Customer Can Cancel | Admin Can Update |
|--------|---------------------|------------------|
| pending | ✅ Yes | ✅ Yes |
| confirmed | ✅ Yes | ✅ Yes |
| processing | ❌ No | ✅ Yes |
| out_for_delivery | ❌ No | ✅ Yes |
| delivered | ❌ No | ❌ No |

---

## 📊 Key Features

### 1. Cart Persistence
- Each user has one active cart
- Cart survives logout/login
- Auto-expires after 7 days of inactivity

### 2. Product Snapshots
- Product details saved at add-to-cart time
- Ensures order history shows correct info even if product changes

### 3. Smart Validation
- Stock availability checked before checkout
- Price changes detected and updated
- Out-of-stock items flagged

### 4. Coupon Intelligence
- Auto-calculates best discount
- Validates all rules before application
- Tracks usage per user

### 5. Order Tracking
- Real-time status updates
- Timeline visualization
- Delivery partner info

---

## 🧪 Testing Checklist

- [ ] Add product to cart
- [ ] Update cart item quantity
- [ ] Remove item from cart
- [ ] Clear cart
- [ ] Apply valid coupon
- [ ] Apply invalid coupon (various scenarios)
- [ ] Remove coupon
- [ ] Validate cart (stock check)
- [ ] Get delivery fee
- [ ] Get delivery slots
- [ ] Create order with COD
- [ ] Create order with online payment
- [ ] View order history
- [ ] Track order status
- [ ] Cancel order (before shipping)
- [ ] Admin: View all orders
- [ ] Admin: Update order status
- [ ] Admin: Assign delivery partner

---

## 💡 Frontend Integration Tips

### Cart Badge Counter

```javascript
const getCartCount = async () => {
  const response = await fetch('/api/v1/cart', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  
  // Total items in cart
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
  return totalItems;
};
```

### Coupon Application

```javascript
const applyCoupon = async (code) => {
  try {
    const response = await fetch('/api/v1/cart/coupon/apply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ couponCode: code })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message with discount amount
      showSuccess(`Coupon applied! You saved ₹${result.data.discount}`);
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError('Failed to apply coupon');
  }
};
```

### Order Tracking UI

```javascript
const trackOrder = async (orderId) => {
  const response = await fetch(`/api/v1/orders/${orderId}/track`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  
  // Render timeline
  data.timeline.forEach(step => {
    renderTimelineStep(step.label, step.completed, step.timestamp);
  });
  
  // Show current status
  showCurrentStatus(data.currentStatus);
  
  // Show delivery partner if assigned
  if (data.deliveryPartner) {
    showDeliveryPartner(data.deliveryPartner);
  }
};
```

---

## 📈 Next Module Options

### **A) Wallet System** (Recommended)
- Add money to wallet
- Use wallet for payments
- Transaction history
- Refunds and cashback

### **B) Subscriptions**
- Recurring orders
- Daily/weekly/monthly plans
- Pause/resume subscriptions
- Subscription management

### **C) Reviews & Ratings**
- Product reviews
- Order reviews
- Rating system
- Review moderation

**Which module would you like to build next?** 🎯

---

**Built with ❤️ for QuickCommerce**# 🛒 Cart & Checkout Module Documentation

## Overview
Complete shopping cart, coupon management, and checkout system with order creation and tracking.

---

## 📦 Features Implemented

### Cart Management
- ✅ Add items to cart
- ✅ Update item quantities
- ✅ Remove items from cart
- ✅ Clear entire cart
- ✅ Cart persistence per user
- ✅ Product snapshot at add time
- ✅ Auto price calculation (subtotal, discount, tax, delivery, total)
- ✅ Stock validation before checkout
- ✅ Cart expiry (7 days for abandoned carts)

### Coupon System
- ✅ Multiple coupon types (percentage, flat, free delivery)
- ✅ Minimum cart value validation
- ✅ Maximum discount amount (for percentage coupons)
- ✅ Usage limits (total & per user)
- ✅ First order only coupons
- ✅ Date-based validity
- ✅ Category/product restrictions
- ✅ Coupon usage tracking
- ✅ Apply/remove coupons from cart

### Checkout & Orders
- ✅ Create order from cart
- ✅ Multiple payment methods (wallet, card, UPI, COD, netbanking)
- ✅ Delivery address selection
- ✅ Delivery slot selection
- ✅ Delivery fee calculation
- ✅ Auto order number generation
- ✅ Stock deduction on order
- ✅ Order status tracking
- ✅ Order cancellation with stock restoration
- ✅ Payment verification
- ✅ Customer notes

### Order Management
- ✅ View order history
- ✅ Track order status
- ✅ Cancel orders
- ✅ Admin order management
- ✅ Status timeline tracking
- ✅ Delivery partner assignment

---

## 🔌 API Endpoints

### Cart Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/cart` | Get user's cart | Yes |
| POST | `/api/v1/cart/add` | Add item to cart | Yes |
| PUT | `/api/v1/cart/items/:itemId` | Update item quantity | Yes |
| DELETE | `/api/v1/cart/items/:itemId` | Remove item from cart | Yes |
| DELETE | `/api/v1/cart/clear` | Clear cart | Yes |
| POST | `/api/v1/cart/coupon/apply` | Apply coupon | Yes |
| DELETE | `/api/v1/cart/coupon/remove` | Remove coupon | Yes |
| GET | `/api/v1/cart/validate` | Validate cart before checkout | Yes |

### Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/checkout/create-order` | Create order from cart | Yes |
| GET | `/api/v1/checkout/delivery-fee` | Get delivery fee estimate | Yes |
| GET | `/api/v1/checkout/delivery-slots` | Get available delivery slots | Yes |
| POST | `/api/v1/checkout/verify-payment` | Verify online payment | Yes |

### Orders (Customer)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/orders/my-orders` | Get user's orders | Yes |
| GET | `/api/v1/orders/:orderId` | Get single order | Yes |
| GET | `/api/v1/orders/:orderId/track` | Track order status | Yes |
| POST | `/api/v1/orders/:orderId/cancel` | Cancel order | Yes |

### Orders (Admin)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/v1/orders/admin/all` | Get all orders | Yes | Admin |
| PUT | `/api/v1/orders/admin/:orderId/status` | Update order status | Yes | Admin |

---

## 📝 API Usage Examples

### 1. Get Cart

```bash
curl -X GET http://localhost:5000/api/v1/cart \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "cart123",
    "user": "user123",
    "items": [
      {
        "_id": "item123",
        "product": {
          "_id": "prod123",
          "name": "Fresh Tomatoes",
          "price": 40,
          "stock": 100,
          "images": [...]
        },
        "quantity": 2,
        "price": 40,
        "productSnapshot": {
          "name": "Fresh Tomatoes",
          "image": "...",
          "sku": "TOM-001",
          "weight": { "value": 500, "unit": "g" }
        }
      }
    ],
    "subtotal": 80,
    "discount": 0,
    "deliveryFee": 40,
    "tax": 0,
    "total": 120,
    "appliedCoupon": null
  }
}
```

---

### 2. Add Item to Cart

```bash
curl -X POST http://localhost:5000/api/v1/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "quantity": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    ...cart object
  }
}
```

---

### 3. Update Cart Item Quantity

```bash
# Update quantity
curl -X PUT http://localhost:5000/api/v1/cart/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'

# Remove item (set quantity to 0)
curl -X PUT http://localhost:5000/api/v1/cart/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 0
  }'
```

---

### 4. Remove Item from Cart

```bash
curl -X DELETE http://localhost:5000/api/v1/cart/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Apply Coupon

```bash
curl -X POST http://localhost:5000/api/v1/cart/coupon/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "WELCOME50"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    ...cart with applied coupon
    "appliedCoupon": {
      "code": "WELCOME50",
      "discountAmount": 50,
      "couponId": "coupon123"
    },
    "discount": 50
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Minimum cart value of ₹200 required"
}
```

---

### 6. Remove Coupon

```bash
curl -X DELETE http://localhost:5000/api/v1/cart/coupon/remove \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Validate Cart Before Checkout

```bash
curl -X GET http://localhost:5000/api/v1/cart/validate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Cart is valid",
  "data": {...cart}
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Cart validation failed",
  "errors": [
    {
      "itemId": "item123",
      "productName": "Fresh Tomatoes",
      "error": "Only 5 units available",
      "availableStock": 5
    }
  ],
  "cart": {...updated cart}
}
```

---

### 8. Get Delivery Fee

```bash
curl -X GET "http://localhost:5000/api/v1/checkout/delivery-fee?pincode=560001&cartValue=300" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pincode": "560001",
    "deliveryFee": 40,
    "estimatedDelivery": "30-45 minutes",
    "freeDeliveryThreshold": 500
  }
}
```

---

### 9. Get Delivery Slots

```bash
curl -X GET "http://localhost:5000/api/v1/checkout/delivery-slots?date=2025-01-15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-01-15",
    "slots": [
      {
        "id": 1,
        "startTime": "08:00",
        "endTime": "10:00",
        "available": true
      },
      {
        "id": 2,
        "startTime": "10:00",
        "endTime": "12:00",
        "available": true
      },
      ...
    ]
  }
}
```

---

### 10. Create Order

```bash
curl -X POST http://localhost:5000/api/v1/checkout/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryAddressId": "address123",
    "paymentMethod": "cod",
    "deliverySlot": {
      "date": "2025-01-15",
      "startTime": "10:00",
      "endTime": "12:00"
    },
    "customerNotes": "Please call before delivery"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "_id": "order123",
    "orderNumber": "ORD250115000