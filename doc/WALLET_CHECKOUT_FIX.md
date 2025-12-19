# Wallet PIN Verification for Checkout

## Issue
When placing an order with wallet payment, the backend is not verifying the wallet PIN, causing a 500 error.

## Solution

Add the following changes to `backend/src/controllers/checkoutController.js`:

### 1. Accept walletPIN parameter (line ~20)
```javascript
const { 
  deliveryAddressId, 
  paymentMethod, 
  deliverySlot,
  customerNotes,
  walletPIN  // ADD THIS
} = req.body;
```

### 2. Add PIN verification before wallet payment (replace lines ~83-99)
```javascript
// If payment method is wallet, check balance and verify PIN
if (paymentMethod === PAYMENT_METHODS.WALLET) {
  const wallet = await Wallet.findOne({ user: userId }).select('+pin');
  if (!wallet) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: 'Wallet not found'
    });
  }

  if (!wallet.hasSufficientBalance(cart.total)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: `Insufficient wallet balance. Available: ₹${wallet.availableBalance}, Required: ₹${cart.total}`
    });
  }

  // Verify wallet PIN
  if (!wallet.isPinSet) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: 'Please set a wallet PIN first'
    });
  }

  if (!walletPIN) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: 'Wallet PIN is required'
    });
  }

  const bcrypt = require('bcryptjs');
  const isPinValid = await bcrypt.compare(walletPIN, wallet.pin);
  if (!isPinValid) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid wallet PIN'
    });
  }
}
```

## Testing
After applying these changes:
1. Restart the backend server
2. Try placing an order with wallet payment
3. Enter the correct PIN
4. Order should be created and money deducted from wallet
5. Transaction should appear in wallet history
