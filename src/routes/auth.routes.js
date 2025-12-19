const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator');

const router = express.Router();

// Validation rules
const sendOTPValidation = [
  body('phone')
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage('Please enter a valid phone number')
];

const verifyOTPValidation = [
  body('phone')
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage('Please enter a valid phone number'),
  body('otp')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('addresses.*.label')
    .optional()
    .isIn(['home', 'work', 'other'])
    .withMessage('Invalid address label'),
  body('addresses.*.fullAddress')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('addresses.*.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('addresses.*.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('addresses.*.pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Invalid pincode'),
  body('addresses.*.isDefault')
    .optional()
    .isBoolean()
    .withMessage('Invalid default address flag')
];

// Routes
router.post('/send-otp', sendOTPValidation, validate, AuthController.sendOTP);
router.post('/verify-otp', verifyOTPValidation, validate, AuthController.verifyOTP);
router.post('/resend-otp', sendOTPValidation, validate, AuthController.resendOTP);
router.post('/refresh-token', refreshTokenValidation, validate, AuthController.refreshToken);
router.post('/test-sms', sendOTPValidation, validate, AuthController.testSMS);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, updateProfileValidation, validate, AuthController.updateProfile);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;