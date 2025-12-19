module.exports = {
  // User Roles
  USER_ROLES: {
    CUSTOMER: 'customer',
    DELIVERY_PARTNER: 'delivery_partner',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
    REFUNDED: 'refunded'
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    WALLET: 'wallet',
    CARD: 'card',
    UPI: 'upi',
    NETBANKING: 'netbanking',
    COD: 'cod'
  },

  // Wallet Transaction Types
  WALLET_TRANSACTION_TYPES: {
    CREDIT: 'credit',
    DEBIT: 'debit',
    REFUND: 'refund'
  },

  // Delivery Status
  DELIVERY_STATUS: {
    ASSIGNED: 'assigned',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    FAILED: 'failed'
  },

  // Subscription Status
  SUBSCRIPTION_STATUS: {
    ACTIVE: 'active',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
  },

  // Subscription Frequency
  SUBSCRIPTION_FREQUENCY: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
  },

  // Coupon Types
  COUPON_TYPES: {
    PERCENTAGE: 'percentage',
    FLAT: 'flat',
    FREE_DELIVERY: 'free_delivery'
  },

  // Product Status
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    OUT_OF_STOCK: 'out_of_stock'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    ORDER: 'order',
    DELIVERY: 'delivery',
    WALLET: 'wallet',
    SUBSCRIPTION: 'subscription',
    PROMOTION: 'promotion',
    SYSTEM: 'system'
  },

  // Response Messages
  MESSAGES: {
    SUCCESS: 'Operation successful',
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error'
  },

  // HTTP Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    SERVER_ERROR: 500
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  }
};