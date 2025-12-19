# 💰 Wallet System Documentation

## Overview
Complete digital wallet system with add money, transactions, payments, refunds, and security features.

---

## 📦 Features Implemented

### Wallet Management
- ✅ Auto wallet creation on user registration
- ✅ Real-time balance tracking
- ✅ Hold balance mechanism (for pending orders)
- ✅ Available balance calculation
- ✅ Daily and monthly spending limits
- ✅ Wallet activation/deactivation
- ✅ Multi-currency support (INR, USD)

### Transactions
- ✅ Add money to wallet
- ✅ Pay from wallet during checkout
- ✅ Auto-refund on order cancellation
- ✅ Transaction history with filters
- ✅ Balance snapshots (before/after)
- ✅ Transaction categories (add_money, order_payment, refund, cashback, bonus)
- ✅ Transaction status tracking
- ✅ Transaction reversal capability

### Security
- ✅ Wallet PIN (4-6 digits)
- ✅ PIN verification for sensitive operations
- ✅ Encrypted PIN storage (bcrypt)
- ✅ Change PIN functionality
- ✅ Insufficient balance protection
- ✅ Negative balance prevention

### Analytics
- ✅ Total credited/debited tracking
- ✅ Category-wise spending statistics
- ✅ Monthly transaction trends
- ✅ Last transaction timestamp

---

## 🔌 API Endpoints

### Wallet Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/wallet` | Get wallet details | Yes |
| POST | `/api/v1/wallet/add-money` | Add money to wallet | Yes |
| POST | `/api/v1/wallet/refund` | Process refund | Yes |
| GET | `/api/v1/wallet/statistics` | Get wallet statistics | Yes |

### Transactions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/wallet/transactions` | Get transaction history | Yes |
| GET | `/api/v1/wallet/transactions/:transactionId` | Get single transaction | Yes |

### Security

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/wallet/set-pin` | Set/update wallet PIN | Yes |
| POST | `/api/v1/wallet/verify-pin` | Verify wallet PIN | Yes |

---

## 📝 API Usage Examples

### 1. Get Wallet Details

```bash
curl -X GET http://localhost:5000/api/v1/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1000,
    "holdBalance": 0,
    "availableBalance": 1000,
    "currency": "INR",
    "isPinSet": false,
    "totalCredited": 1000,
    "totalDebited": 0,
    "lastTransactionAt": null
  }
}
```

---

### 2. Add Money to Wallet

```bash
curl -X POST http://localhost:5000/api/v1/wallet/add-money \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "paymentMethod": "upi",
    "paymentDetails": {
      "transactionId": "UPI123456789",
      "upiId": "user@paytm"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Money added successfully",
  "data": {
    "transactionId": "TXN2501150000001",
    "amount": 500,
    "newBalance": 1500,
    "availableBalance": 1500
  }
}
```

---

### 3. Pay via Wallet (During Checkout)

This happens automatically when you select wallet as payment method in checkout.

```bash
curl -X POST http://localhost:5000/api/v1/checkout/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryAddressId": "ADDRESS_ID",
    "paymentMethod": "wallet",
    "deliverySlot": {
      "date": "2025-01-15",
      "startTime": "10:00",
      "endTime": "12:00"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderNumber": "ORD2501150001",
    "paymentMethod": "wallet",
    "paymentStatus": "completed",
    "paymentDetails": {
      "transactionId": "WALLET_1705305600000",
      "paymentGateway": "wallet",
      "paidAt": "2025-01-15T10:00:00.000Z"
    },
    "total": 290
  }
}
```

---

### 4. Get Transaction History

```bash
# All transactions
curl -X GET http://localhost:5000/api/v1/wallet/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by type
curl -X GET "http://localhost:5000/api/v1/wallet/transactions?type=credit&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by category
curl -X GET "http://localhost:5000/api/v1/wallet/transactions?category=order_payment" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by date range
curl -X GET "http://localhost:5000/api/v1/wallet/transactions?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "txn123",
      "transactionId": "TXN2501150000001",
      "type": "credit",
      "amount": 500,
      "balanceBefore": 1000,
      "balanceAfter": 1500,
      "description": "Added money to wallet",
      "category": "add_money",
      "status": "completed",
      "paymentGateway": {
        "name": "upi",
        "transactionId": "UPI123456789",
        "status": "success"
      },
      "createdAt": "2025-01-15T09:00:00.000Z",
      "completedAt": "2025-01-15T09:00:00.000Z"
    },
    {
      "_id": "txn124",
      "transactionId": "TXN2501150000002",
      "type": "debit",
      "amount": 290,
      "balanceBefore": 1500,
      "balanceAfter": 1210,
      "description": "Payment for order ORD2501150001",
      "category": "order_payment",
      "order": {
        "_id": "order123",
        "orderNumber": "ORD2501150001",
        "status": "delivered"
      },
      "status": "completed",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "completedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### 5. Get Single Transaction

```bash
curl -X GET http://localhost:5000/api/v1/wallet/transactions/TXN2501150000001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN2501150000001",
    "type": "credit",
    "amount": 500,
    "balanceBefore": 1000,
    "balanceAfter": 1500,
    "description": "Added money to wallet",
    "category": "add_money",
    "status": "completed",
    "paymentGateway": {
      "name": "upi",
      "transactionId": "UPI123456789"
    },
    "createdAt": "2025-01-15T09:00:00.000Z",
    "completedAt": "2025-01-15T09:00:00.000Z"
  }
}
```

---

### 6. Set Wallet PIN

```bash
# First time setting PIN
curl -X POST http://localhost:5000/api/v1/wallet/set-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }'

# Changing existing PIN
curl -X POST http://localhost:5000/api/v1/wallet/set-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "5678",
    "oldPin": "1234"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

---

### 7. Verify Wallet PIN

```bash
curl -X POST http://localhost:5000/api/v1/wallet/verify-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "PIN verified successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid PIN"
}
```

---

### 8. Get Wallet Statistics

```bash
curl -X GET http://localhost:5000/api/v1/wallet/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentBalance": 1210,
    "availableBalance": 1210,
    "totalCredited": 1500,
    "totalDebited": 290,
    "categoryStats": [
      {
        "_id": "add_money",
        "count": 1,
        "totalAmount": 500
      },
      {
        "_id": "order_payment",
        "count": 1,
        "totalAmount": 290
      }
    ],
    "monthlyTrend": [
      {
        "_id": "2025-01-15",
        "credits": 500,
        "debits": 290
      }
    ]
  }
}
```

---

### 9. Auto-Refund on Order Cancellation

When you cancel an order paid via wallet, refund is automatic:

```bash
curl -X POST http://localhost:5000/api/v1/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Changed my mind"
  }'
```

**Response includes refund info:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderNumber": "ORD2501150001",
    "status": "cancelled",
    "paymentStatus": "refunded"
  }
}
```

Check wallet transactions to see the refund entry.

---

## 🗂️ Database Models

### Wallet Schema

```javascript
{
  user: ObjectId,              // ref to User, unique
  balance: Number,             // Current balance (min: 0)
  holdBalance: Number,         // Amount on hold for pending orders
  currency: String,            // INR, USD (default: INR)
  isActive: Boolean,           // Wallet status
  pin: String,                 // Hashed PIN (4-6 digits)
  isPinSet: Boolean,           // PIN setup status
  dailyLimit: Number,          // Daily spending limit (default: 10000)
  monthlyLimit: Number,        // Monthly spending limit (default: 50000)
  lastTransactionAt: Date,
  totalCredited: Number,       // Lifetime credits
  totalDebited: Number,        // Lifetime debits
  createdAt: Date,
  updatedAt: Date
}
```

**Virtual Fields:**
- `availableBalance` = balance - holdBalance

---

### Transaction Schema

```javascript
{
  transactionId: String,       // Unique (TXN-YYMMDD-XXXXXX)
  user: ObjectId,              // ref to User
  wallet: ObjectId,            // ref to Wallet
  type: String,                // credit, debit, refund
  amount: Number,              // Transaction amount
  balanceBefore: Number,       // Balance before transaction
  balanceAfter: Number,        // Balance after transaction
  description: String,         // Transaction description
  category: String,            // add_money, order_payment, refund, 
                               // cashback, bonus, penalty, withdrawal
  order: ObjectId,             // ref to Order (if applicable)
  paymentGateway: {
    name: String,
    transactionId: String,
    status: String
  },
  metadata: Map,               // Additional data
  status: String,              // pending, completed, failed, reversed
  failureReason: String,
  reversedTransaction: ObjectId, // ref to reversed transaction
  isReversed: Boolean,
  reversedAt: Date,
  processedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Business Logic

### Balance Calculation

```javascript
// Total Balance
balance = sum of all credits - sum of all debits

// Hold Balance
holdBalance = amount held for pending/processing orders

// Available Balance
availableBalance = balance - holdBalance
```

### Transaction ID Generation

Format: `TXN{YY}{MM}{DD}{SEQUENCE}`
- YY: Last 2 digits of year
- MM: Month (01-12)
- DD: Day (01-31)
- SEQUENCE: 6-digit daily counter (000001-999999)

Example: `TXN250115000023` = 23rd transaction on Jan 15, 2025

---

### Transaction Types

1. **CREDIT**
   - Add money
   - Cashback
   - Refunds
   - Bonus/rewards

2. **DEBIT**
   - Order payments
   - Penalties
   - Withdrawals

3. **REFUND**
   - Order cancellations
   - Reversed transactions

---

### Wallet Operations

#### Add Money
```javascript
1. Validate amount (must be > 0)
2. Process payment via gateway
3. Credit wallet balance
4. Create transaction record
5. Update totalCredited
```

#### Pay from Wallet
```javascript
1. Check if wallet exists and is active
2. Verify sufficient balance
3. Debit wallet balance
4. Create transaction record
5. Update totalDebited
6. Link transaction to order
```

#### Refund
```javascript
1. Verify order ownership
2. Credit wallet balance
3. Create refund transaction
4. Update totalCredited
5. Link to original order
```

---

### Hold & Release Mechanism

**Hold Balance** (Future use for pending orders):
```javascript
// Hold amount when order is placed (before payment confirmation)
wallet.hold(amount)

// Release if payment fails
wallet.release(amount)

// Capture if payment succeeds
wallet.capture(amount) // Converts hold to actual debit
```

---

## 🔐 Security Features

### PIN Security
- 4-6 digit numeric PIN
- Hashed using bcrypt (salt rounds: 10)
- PIN required for sensitive operations
- Old PIN verification when changing PIN
- No PIN recovery (must contact support)

### Balance Protection
- Negative balance prevented at model level
- Insufficient balance checks before debit
- Hold balance mechanism for pending transactions
- Daily/monthly spending limits

### Transaction Safety
- Atomic operations (balance + transaction in same save)
- Transaction reversal capability
- Failed transaction tracking
- Status-based state management

---

## 📊 Key Features

### 1. Auto Wallet Creation
- Wallet created automatically on user registration
- Starts with ₹0 balance (or seed amount in development)
- Active by default

### 2. Seamless Checkout
- Select wallet as payment method
- Instant payment (no external gateway delay)
- Auto order confirmation
- Real-time balance update

### 3. Smart Refunds
- Auto-refund on order cancellation
- Instant wallet credit
- Refund transaction recorded
- Original order reference maintained

### 4. Comprehensive History
- Every transaction logged
- Balance snapshots (before/after)
- Category-wise tracking
- Date range filtering
- Order linkage

### 5. Analytics
- Spending patterns
- Category-wise breakdown
- Monthly trends
- Total credits/debits

---

## 🧪 Testing Workflow

### 1. Initial Setup
```bash
# Seed database (creates users with wallets)
npm run seed

# Login as customer
# Phone: +919876543210
# Initial wallet balance: ₹1000
```

### 2. Add Money
```bash
curl -X POST http://localhost:5000/api/v1/wallet/add-money \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 500, "paymentMethod": "upi"}'

# New balance: ₹1500
```

### 3. Shop & Pay
```bash
# Add items to cart
# Apply coupon (optional)
# Checkout with wallet payment
# Order created, wallet debited
```

### 4. Check Transactions
```bash
curl -X GET http://localhost:5000/api/v1/wallet/transactions \
  -H "Authorization: Bearer TOKEN"

# See add_money and order_payment transactions
```

### 5. Cancel & Refund
```bash
# Cancel the order
# Check wallet - refund credited automatically
# Verify refund transaction in history
```

---

## 💡 Frontend Integration Tips

### Wallet Balance Display

```javascript
const fetchWalletBalance = async () => {
  const response = await fetch('/api/v1/wallet', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  
  return {
    balance: data.balance,
    available: data.availableBalance,
    currency: data.currency
  };
};

// Display: ₹1,210
```

### Add Money Flow

```javascript
const addMoney = async (amount) => {
  // 1. Show payment gateway modal
  const paymentDetails = await initiatePaymentGateway(amount);
  
  // 2. After successful payment, add to wallet
  const response = await fetch('/api/v1/wallet/add-money', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      paymentMethod: 'upi',
      paymentDetails
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showSuccess(`₹${amount} added to wallet`);
    updateWalletBalance(result.data.newBalance);
  }
};
```

### Checkout with Wallet

```javascript
const checkoutWithWallet = async (cart, addressId) => {
  // 1. Check wallet balance
  const wallet = await fetchWalletBalance();
  
  if (wallet.available < cart.total) {
    showError(`Insufficient balance. Add ₹${cart.total - wallet.available} more`);
    return;
  }
  
  // 2. Create order
  const response = await fetch('/api/v1/checkout/create-order', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deliveryAddressId: addressId,
      paymentMethod: 'wallet'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showSuccess('Order placed successfully!');
    navigateToOrderDetails(result.data.orderNumber);
  }
};
```

### Transaction History UI

```javascript
const renderTransactions = (transactions) => {
  return transactions.map(txn => ({
    id: txn.transactionId,
    date: new Date(txn.createdAt).toLocaleDateString(),
    description: txn.description,
    amount: txn.amount,
    type: txn.type, // credit or debit
    balance: txn.balanceAfter,
    icon: getIconForCategory(txn.category),
    color: txn.type === 'credit' ? 'green' : 'red'
  }));
};
```

---

## 🚀 Quick Start

### 1. Seed Database with Wallets

```bash
npm run seed
```

Creates:
- Customer wallet with ₹1000
- Admin wallet with ₹5000

### 2. Login & Check Balance

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# Get wallet
curl -X GET http://localhost:5000/api/v1/wallet \
  -H "Authorization: Bearer TOKEN"
```

### 3. Add Money

```bash
curl -X POST http://localhost:5000/api/v1/wallet/add-money \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 500, "paymentMethod": "card"}'
```

### 4. Pay via Wallet

```bash
# Add items to cart, then checkout
curl -X POST http://localhost:5000/api/v1/checkout/create-order \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "deliveryAddressId": "ADDR_ID",
    "paymentMethod": "wallet"
  }'
```

---

## 📈 What's Next?

### Upcoming Enhancements
- ⏳ Wallet-to-wallet transfers
- ⏳ QR code payments
- ⏳ Scheduled payments
- ⏳ Wallet freeze/unfreeze
- ⏳ Transaction disputes
- ⏳ Loyalty points integration
- ⏳ Multi-wallet support (personal, business)

---

**Built with ❤️ for QuickCommerce**