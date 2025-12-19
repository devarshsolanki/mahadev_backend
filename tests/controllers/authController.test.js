
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const OTPService = require('../../src/services/otpService');

jest.mock('../../src/services/otpService');
jest.mock('../../src/models/User');

describe('Auth Controller', () => {
  describe('POST /api/auth/send-otp', () => {
    it('should return 200 and a success message when OTP is sent successfully', async () => {
      OTPService.sendOTP.mockResolvedValue({ success: true, message: 'OTP sent successfully' });

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '1234567890' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('OTP sent successfully');
    });

    it('should return 400 if phone number is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Phone number is required');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return 200 and a success message when OTP is verified and a new user is created', async () => {
      OTPService.verifyOTP.mockResolvedValue({ success: true });
      // Mock that no user is found initially
      User.findOne.mockResolvedValue(null);
      // Mock the creation of a new user
      User.create.mockResolvedValue({
        _id: 'some-user-id',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        getPublicProfile: () => ({ name: 'Test User', phone: '1234567890' })
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '1234567890', otp: '123456', name: 'Test User' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNewUser).toBe(true);
      expect(res.body.message).toBe('Registration successful');
    });

    it('should return 200 and a success message when OTP is verified and an existing user logs in', async () => {
      OTPService.verifyOTP.mockResolvedValue({ success: true });
      // Mock finding an existing user
      const mockUser = {
        _id: 'some-user-id',
        isVerified: false,
        lastLogin: null,
        save: jest.fn().mockResolvedValue(true),
        getPublicProfile: () => ({ name: 'Existing User', phone: '1234567890' })
      };
      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '1234567890', otp: '123456' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNewUser).toBe(false);
      expect(res.body.message).toBe('Login successful');
    });

    it('should return 401 if OTP is invalid', async () => {
      OTPService.verifyOTP.mockResolvedValue({ success: false, message: 'Invalid OTP' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '1234567890', otp: '654321' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid OTP');
    });

    it('should return 400 if phone or OTP is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Phone number and OTP are required');
    });

    it('should return 400 if name is not provided for a new user', async () => {
      OTPService.verifyOTP.mockResolvedValue({ success: true });
      User.findOne.mockResolvedValue(null); // Mock that user does not exist

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '1234567890', otp: '123456' }); // No name provided

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Name is required for new users');
    });
  });
});
