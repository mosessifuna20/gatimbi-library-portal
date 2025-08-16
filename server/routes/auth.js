import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticateToken, authRateLimit, logActivity } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  authRateLimit,
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['junior_member', 'adult_member']).withMessage('Invalid role selected'),
  body('nationalId').if(body('role').equals('adult_member')).notEmpty().withMessage('National ID is required for adults'),
  body('birthCertificate').if(body('role').equals('junior_member')).notEmpty().withMessage('Birth certificate is required for juniors'),
  body('guardianName').if(body('role').equals('junior_member')).notEmpty().withMessage('Guardian name is required for juniors'),
  body('guardianPhone').if(body('role').equals('junior_member')).notEmpty().withMessage('Guardian phone is required for juniors'),
  body('guardianEmail').if(body('role').equals('junior_member')).isEmail().withMessage('Valid guardian email is required for juniors'),
  body('guardianId').if(body('role').equals('junior_member')).notEmpty().withMessage('Guardian ID is required for juniors'),
  body('school').if(body('role').equals('junior_member')).notEmpty().withMessage('School is required for juniors')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name, email, phone, password, role,
      nationalId, birthCertificate,
      guardianName, guardianPhone, guardianEmail, guardianId, school
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Check for duplicate national ID or birth certificate
    if (role === 'adult_member') {
      const existingAdult = await User.findOne({ nationalId });
      if (existingAdult) {
        return res.status(400).json({
          success: false,
          message: 'User with this National ID already exists'
        });
      }
    }

    if (role === 'junior_member') {
      const existingJunior = await User.findOne({ birthCertificate });
      if (existingJunior) {
        return res.status(400).json({
          success: false,
          message: 'User with this Birth Certificate already exists'
        });
      }
    }

    // Create user data object
    const userData = {
      name,
      email,
      phone,
      password,
      role,
      status: 'pending' // Requires approval
    };

    // Add role-specific fields
    if (role === 'adult_member') {
      userData.nationalId = nationalId;
    } else if (role === 'junior_member') {
      userData.birthCertificate = birthCertificate;
      userData.guardianName = guardianName;
      userData.guardianPhone = guardianPhone;
      userData.guardianEmail = guardianEmail;
      userData.guardianId = guardianId;
      userData.school = school;
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // Send confirmation email
    try {
      await notificationService.sendNotification({
        user,
        type: 'account_created',
        title: 'Account Registration Successful',
        message: `Dear ${name}, your account has been registered successfully and is pending approval. You will receive a notification once your account is approved.`,
        channels: ['email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send registration confirmation:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  authRateLimit,
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: user.status === 'pending' 
          ? 'Your account is pending approval. Please wait for a librarian to approve your account.'
          : 'Your account is not active. Please contact the library staff.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          photo: user.photo,
          fineBalance: user.fineBalance,
          maxBooksAllowed: user.maxBooksAllowed,
          currentBooksBorrowed: user.currentBooksBorrowed
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/register-staff
// @desc    Register staff members (Admin/Chief Librarian only)
// @access  Private (Admin/Chief Librarian)
router.post('/register-staff', [
  authenticateToken,
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['librarian', 'chief_librarian']).withMessage('Invalid staff role'),
  body('nationalId').notEmpty().withMessage('National ID is required for staff')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if requester can manage staff
    if (!['admin', 'chief_librarian'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to register staff'
      });
    }

    // Chief Librarian cannot register other Chief Librarians
    if (req.user.role === 'chief_librarian' && req.body.role === 'chief_librarian') {
      return res.status(403).json({
        success: false,
        message: 'Chief Librarians can only register regular librarians'
      });
    }

    const { name, email, phone, password, role, nationalId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { nationalId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, phone, or National ID already exists'
      });
    }

    // Create staff user
    const user = new User({
      name,
      email,
      phone,
      password,
      role,
      nationalId,
      status: 'active', // Staff accounts are auto-approved
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Staff member registered successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Staff registration failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/register-admin
// @desc    Register the first admin user (no auth required)
// @access  Public (only for initial setup)
router.post('/register-admin', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('nationalId').notEmpty().withMessage('National ID is required'),
  body('adminCode').equals(process.env.ADMIN_SETUP_CODE || 'GATIMBI2024').withMessage('Invalid admin setup code')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    const { name, email, phone, password, nationalId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { nationalId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, phone, or National ID already exists'
      });
    }

    // Create admin user
    const user = new User({
      name,
      email,
      phone,
      password,
      role: 'admin',
      nationalId,
      status: 'active',
      approvedBy: null, // Self-approved
      approvedAt: new Date()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin registration failed. Please try again.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('approvedBy', 'name role');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store reset token in user document (in production, use separate collection with expiry)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email
    try {
      await notificationService.sendEmail(
        user.email,
        'Password Reset Request',
        `
        <h2>Password Reset Request</h2>
        <p>Dear ${user.name},</p>
        <p>You have requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Gatimbi Library Team</p>
        `
      );
    } catch (error) {
      console.error('Failed to send reset email:', error);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;
