# 🔄 Subscription System Documentation

## Overview
Complete recurring order system with auto-renewal, wallet integration, and intelligent failure handling.

---

## 📦 Features Implemented

### Subscription Management
- ✅ Create subscriptions with multiple items
- ✅ Daily, weekly, and monthly frequencies
- ✅ Flexible delivery schedules
- ✅ Delivery time slots
- ✅ Custom delivery days (weekly)
- ✅ Specific delivery dates (monthly)
- ✅ Auto order generation
- ✅ Wallet integration for payments

### Lifecycle Management
- ✅ Pause subscriptions (with optional resume date)
- ✅ Resume subscriptions
- ✅ Cancel subscriptions
- ✅ Update delivery schedule
- ✅ Track subscription statistics

### Auto-Processing
- ✅ Cron job for due subscriptions (hourly)
- ✅ Automatic order creation
- ✅ Wallet payment processing
- ✅ Stock validation
- ✅ Failure handling with auto-pause
- ✅ Success/failure tracking

### Intelligent Features
- ✅ Consecutive failure tracking
- ✅ Auto-pause after 3 failures
- ✅ Insufficient balance handling
- ✅ Out-of-stock detection
- ✅ Next delivery calculation
- ✅ Subscription statistics

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/subscriptions` | Create subscription | Yes |
| GET | `/api/v1/subscriptions` | Get user's subscriptions | Yes |
| GET | `/api/v1/subscriptions/:id` | Get single subscription | Yes |
| PUT | `/api/v1/subscriptions/:id` | Update subscription | Yes |
| POST | `/api/v1/subscriptions/:id/pause` | Pause subscription | Yes |
| POST | `/api/v1/subscriptions/:id/resume` | Resume subscription | Yes |
| POST | `/api/v1/subscriptions/:id/cancel` | Cancel subscription | Yes |
| GET | `/api/v1/subscriptions/statistics` | Get statistics | Yes |

---

## 📝 API Usage Examples

### 1. Create Daily Subscription

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 2
      }
    ],
    "frequency": "daily",
    "deliveryTime": {
      "hour": 8,
      "minute": 0
    },
    "deliveryAddressId": "ADDRESS_ID",
    "paymentMethod": "wallet",
    "customerNotes": "Please ring doorbell"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "subscriptionId": "SUB2501000001",
    "frequency": "daily",
    "nextDeliveryDate": "2025-01-16T08:00:00.000Z",
    "total": 120,
    "status": "active"
  }
}
```

---

### 2. Create Weekly Subscription

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "MILK_PRODUCT_ID",
        "quantity": 7
      }
    ],
    "frequency": "weekly",
    "deliveryDays": [1, 3, 5],
    "deliveryTime": {
      "hour": 7,
      "minute": 30
    },
    "deliveryAddressId": "ADDRESS_ID",
    "paymentMethod": "wallet"
  }'
```

**Delivery Days:**
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

---

### 3. Create Monthly Subscription

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "RICE_PRODUCT_ID",
        "quantity": 2
      }
    ],
    "frequency": "monthly",
    "deliveryDate": 1,
    "deliveryTime": {
      "hour": 10,
      "minute": 0
    },
    "deliveryAddressId": "ADDRESS_ID",
    "paymentMethod": "wallet"
  }'
```

---

### 4. Get User's Subscriptions

```bash
# All subscriptions
curl -X GET http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:5000/api/v1/subscriptions?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "SUB2501000001",
      "frequency": "daily",
      "nextDeliveryDate": "2025-01-16T08:00:00.000Z",
      "status": "active",
      "total": 120,
      "totalOrders": 5,
      "successfulOrders": 5,
      "items": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

---

### 5. Pause Subscription

```bash
# Pause indefinitely
curl -X POST http://localhost:5000/api/v1/subscriptions/SUB2501000001/pause \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Going on vacation"
  }'

# Pause with auto-resume date
curl -X POST http://localhost:5000/api/v1/subscriptions/SUB2501000001/pause \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Traveling",
    "resumeDate": "2025-02-01T00:00:00.000Z"
  }'
```

---

### 6. Resume Subscription

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions/SUB2501000001/resume \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Cancel Subscription

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions/SUB2501000001/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "No longer needed"
  }'
```

---

### 8. Update Delivery Schedule

```bash
curl -X PUT http://localhost:5000/api/v1/subscriptions/SUB2501000001 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryTime": {
      "hour": 9,
      "minute": 30
    },
    "deliveryDays": [1, 3, 5, 7]
  }'
```

---

## 🤖 Automatic Processing

### Cron Jobs

1. **Process Due Subscriptions** - Every hour
   - Finds subscriptions where `nextDeliveryDate <= now`
   - Creates orders automatically
   - Processes wallet payments
   - Updates next delivery date

2. **Check Paused Subscriptions** - Every 6 hours
   - Finds paused subscriptions with `resumeDate <= now`
   - Automatically resumes them

3. **Send Reminders** - Daily at 8 AM
   - Sends reminders for subscriptions due in 24 hours

### Manual Processing

```bash
# Run subscription processing manually
npm run process-subscriptions
```

---

## 🎯 Business Logic

### Subscription ID Format
```
SUB{YY}{MM}{XXXXX}
Example: SUB2501000023 = 23rd subscription in Jan 2025
```

### Next Delivery Calculation

**Daily:**
```
nextDelivery = currentDate + 1 day
```

**Weekly:**
```
nextDelivery = next occurrence of selected weekday
Example: If deliveryDays = [1,3,5] (Mon, Wed, Fri)
  - If today is Monday, next is Wednesday
  - If today is Friday, next is Monday
```

**Monthly:**
```
nextDelivery = same date next month
If deliveryDate = 15
  - Jan 15 → Feb 15 → Mar 15
If deliveryDate = 31 and next month has 30 days
  - Uses last day of month (30th)
```

### Failure Handling

```
1. Subscription due
2. Check wallet balance
3. If insufficient → record failure, consecutiveFailures++
4. If consecutiveFailures >= 3 → auto-pause
5. If stock unavailable → record failure
6. Send notification to user
```

### Success Flow

```
1. Subscription due
2. Validate stock availability
3. Check wallet balance
4. Create order
5. Deduct from wallet
6. Update product stock
7. Record success (totalOrders++, successfulOrders++)
8. Reset consecutiveFailures to 0
9. Calculate and set next delivery date
10. Send confirmation notification
```

---

## 🗂️ Database Model

```javascript
{
  subscriptionId: String,       // Unique (SUB-YYMM-XXXXX)
  user: ObjectId,               // ref to User
  items: [
    {
      product: ObjectId,        // ref to Product
      variantId: ObjectId,
      quantity: Number,
      price: Number,
      productSnapshot: {
        name: String,
        image: String,
        sku: String,
        weight: Object
      }
    }
  ],
  frequency: String,            // daily, weekly, monthly
  deliveryTime: {
    hour: Number,               // 0-23
    minute: Number              // 0-59
  },
  deliveryDays: [Number],       // 0-6 (for weekly)
  deliveryDate: Number,         // 1-31 (for monthly)
  deliveryAddress: ObjectId,    // ref to User.addresses
  subtotal: Number,
  deliveryFee: Number,
  tax: Number,
  total: Number,
  paymentMethod: String,        // Default: wallet
  status: String,               // active, paused, cancelled, expired
  startDate: Date,
  endDate: Date,
  nextDeliveryDate: Date,       // Next scheduled delivery
  lastDeliveryDate: Date,       // Last completed delivery
  pausedAt: Date,
  pauseReason: String,
  resumeDate: Date,
  cancelledAt: Date,
  cancellationReason: String,
  totalOrders: Number,          // Total attempted
  successfulOrders: Number,     // Successfully completed
  failedOrders: Number,         // Failed attempts
  totalSpent: Number,           // Total amount spent
  consecutiveFailures: Number,  // Auto-pause trigger
  maxConsecutiveFailures: Number, // Default: 3
  customerNotes: String,
  internalNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 💡 Key Features

### 1. Flexible Scheduling
- **Daily**: Every day at specified time
- **Weekly**: Specific days (e.g., Mon, Wed, Fri)
- **Monthly**: Specific date each month

### 2. Smart Failure Handling
- Tracks consecutive failures
- Auto-pauses after 3 failures
- Prevents unnecessary retry attempts
- Notifies user of issues

### 3. Wallet Integration
- Auto-debit from wallet
- Instant payment confirmation
- No manual intervention needed
- Transaction history maintained

### 4. Product Snapshots
- Stores product details at subscription time
- Historical accuracy
- Price changes don't affect existing subscriptions

### 5. Pause & Resume
- Pause for vacation/travel
- Set automatic resume date
- Flexible scheduling
- Zero consecutive failures on resume

---

## 📊 Statistics & Analytics

### Subscription Statistics

```bash
curl -X GET http://localhost:5000/api/v1/subscriptions/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSubscriptions": 5,
    "activeSubscriptions": 3,
    "byStatus": [
      {
        "_id": "active",
        "count": 3,
        "totalSpent": 3600
      },
      {
        "_id": "paused",
        "count": 1,
        "totalSpent": 480
      },
      {
        "_id": "cancelled",
        "count": 1,
        "totalSpent": 240
      }
    ]
  }
}
```

### Individual Subscription Stats

Each subscription tracks:
- `totalOrders`: Total delivery attempts
- `successfulOrders`: Successfully completed
- `failedOrders`: Failed attempts
- `totalSpent`: Total amount spent
- `consecutiveFailures`: Current failure streak

---

## 🚀 Use Cases

### Daily Milk Delivery
```json
{
  "items": [{"productId": "MILK_ID", "quantity": 1}],
  "frequency": "daily",
  "deliveryTime": {"hour": 6, "minute": 0}
}
```

### Weekly Grocery Box
```json
{
  "items": [
    {"productId": "RICE_ID", "quantity": 1},
    {"productId": "FLOUR_ID", "quantity": 1},
    {"productId": "OIL_ID", "quantity": 1}
  ],
  "frequency": "weekly",
  "deliveryDays": [6],
  "deliveryTime": {"hour": 10, "minute": 0}
}
```

### Monthly Staples
```json
{
  "items": [
    {"productId": "RICE_ID", "quantity": 5},
    {"productId": "FLOUR_ID", "quantity": 5}
  ],
  "frequency": "monthly",
  "deliveryDate": 1,
  "deliveryTime": {"hour": 9, "minute": 0}
}
```

---

## 🧪 Testing

### Create Test Subscription

```bash
# 1. Login
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# 2. Get product ID
PRODUCT_ID=$(curl -s http://localhost:5000/api/v1/products?limit=1 | jq -r '.data[0]._id')

# 3. Get address ID
ADDRESS_ID=$(curl -s http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer TOKEN" | jq -r '.user.addresses[0]._id')

# 4. Create subscription
curl -X POST http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer TOKEN" \
  -d "{
    \"items\": [{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1}],
    \"frequency\": \"daily\",
    \"deliveryAddressId\": \"$ADDRESS_ID\"
  }"
```

### Manually Process Subscriptions

```bash
npm run process-subscriptions
```

---

## 🔐 Security & Validation

### Input Validation
- All items must have valid product IDs
- Products must support subscriptions
- Delivery address must exist
- Payment method must be valid
- Frequency must be valid enum value

### Authorization
- Only subscription owner can view/modify
- Admin cannot modify user subscriptions
- All endpoints require authentication

### Payment Security
- Wallet balance checked before processing
- Atomic transactions (order + payment)
- Failure rollback if payment fails
- Transaction audit trail maintained

---

## 📈 Performance Optimization

### Cron Job Efficiency
- Processes only due subscriptions
- Bulk operations where possible
- Error handling per subscription
- Logging for monitoring

### Database Indexes
- `subscriptionId` (unique)
- `user + status`
- `status + nextDeliveryDate`
- `frequency`

---

## 💡 Frontend Integration Tips

### Create Subscription UI

```javascript
const createSubscription = async (items, frequency, schedule) => {
  const response = await fetch('/api/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items,
      frequency,
      ...schedule,
      deliveryAddressId: selectedAddress,
      paymentMethod: 'wallet'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showSuccess(`Subscription created! Next delivery: ${result.data.nextDeliveryDate}`);
  }
};
```

### Subscription Management Dashboard

```javascript
const SubscriptionCard = ({ subscription }) => (
  <div>
    <h3>{subscription.subscriptionId}</h3>
    <p>Frequency: {subscription.frequency}</p>
    <p>Next Delivery: {formatDate(subscription.nextDeliveryDate)}</p>
    <p>Total Orders: {subscription.totalOrders}</p>
    <p>Success Rate: {(subscription.successfulOrders / subscription.totalOrders * 100).toFixed(1)}%</p>
    
    <button onClick={() => pauseSubscription(subscription.subscriptionId)}>
      Pause
    </button>
    <button onClick={() => cancelSubscription(subscription.subscriptionId)}>
      Cancel
    </button>
  </div>
);
```

### Delivery Schedule Picker

```javascript
const WeeklySchedule = ({ selectedDays, onChange }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div>
      {days.map((day, index) => (
        <button
          key={index}
          className={selectedDays.includes(index) ? 'selected' : ''}
          onClick={() => toggleDay(index)}
        >
          {day}
        </button>
      ))}
    </div>
  );
};
```

---

## 🎯 Business Benefits

### For Customers
- ✅ Never run out of essentials
- ✅ Auto-payment (no manual intervention)
- ✅ Flexible scheduling
- ✅ Easy pause/resume
- ✅ Predictable spending

### For Business
- ✅ Recurring revenue
- ✅ Customer retention
- ✅ Predictable demand
- ✅ Reduced customer acquisition cost
- ✅ Higher lifetime value

---

## 📊 Metrics to Track

### Subscription Health
- Active subscription count
- Churn rate (cancellations)
- Pause rate
- Average subscription value
- Success rate per subscription

### Financial Metrics
- Monthly recurring revenue (MRR)
- Average revenue per subscription
- Lifetime value
- Payment failure rate

### Operational Metrics
- Processing success rate
- Average processing time
- Stock-out incidents
- Customer support tickets

---

## 🚨 Common Issues & Solutions

### Issue: Payment Failures
**Solution**: 
- User gets notification to add money
- Auto-pauses after 3 failures
- Easy resume once balance added

### Issue: Stock Unavailable
**Solution**:
- Subscription records failure
- Notifies user
- Suggests alternatives
- Auto-resumes next cycle

### Issue: Address Changed
**Solution**:
- User can update delivery address
- Takes effect from next delivery
- Historical orders maintain old address

---

## 🎓 Best Practices

### For Development
1. Always validate stock before processing
2. Check wallet balance before order creation
3. Use atomic transactions for order + payment
4. Log all processing attempts
5. Send notifications for all state changes

### For Production
1. Monitor cron job execution
2. Set up alerts for high failure rates
3. Track wallet balance trends
4. Regular backup of subscription data
5. Performance monitoring on processing

---

## ⏭️ Future Enhancements

### Planned Features
- ⏳ Custom subscription intervals (every 2 days, etc.)
- ⏳ One-time skip next delivery
- ⏳ Modify items mid-subscription
- ⏳ Gift subscriptions
- ⏳ Subscription discounts
- ⏳ Auto-upgrade to higher quantity
- ⏳ Loyalty rewards for long subscriptions

---

## 📝 Complete Example Flow

```bash
# 1. Create subscription
POST /api/v1/subscriptions
{
  "items": [{"productId": "MILK", "quantity": 1}],
  "frequency": "daily",
  "deliveryTime": {"hour": 7, "minute": 0}
}

# Response: subscriptionId = SUB2501000001

# 2. System automatically processes (cron job)
# - Every day at 7:00 AM
# - Creates order
# - Debits wallet
# - Schedules next delivery

# 3. User can manage
GET /api/v1/subscriptions/SUB2501000001
POST /api/v1/subscriptions/SUB2501000001/pause
POST /api/v1/subscriptions/SUB2501000001/resume
POST /api/v1/subscriptions/SUB2501000001/cancel
```

---

**Built with ❤️ for QuickCommerce**

**Current Progress: 100% Complete - All Core Modules Done! 🎉**