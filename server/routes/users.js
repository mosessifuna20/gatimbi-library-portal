import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { 
  authenticateToken, 
  requireRole, 
  canManageUsers, 
  logActivity 
} from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (filtered by role permissions)
// @access  Private (Staff only)
router.get('/', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  logActivity('user_list_view', 'user')
], async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user's role
    let query = {};
    
    if (req.user.role === 'librarian') {
      // Librarians can only see members
      query.role = { $in: ['junior_member', 'adult_member'] };
    } else if (req.user.role === 'chief_librarian') {
      // Chief librarians can see members and librarians
      query.role = { $nin: ['admin'] };
    }
    // Admin can see everyone

    // Add filters
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// @route   GET /api/users/pending
// @desc    Get pending user approvals
// @access  Private (Staff only)
router.get('/pending', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  logActivity('pending_users_view', 'user')
], async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: pendingUsers
    });

  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Staff or self)
router.get('/:id', [
  authenticateToken,
  logActivity('user_detail_view', 'user')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're staff
    if (req.user.role === 'guest' || req.user.role === 'junior_member' || req.user.role === 'adult_member') {
      if (id !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own profile'
        });
      }
    }

    const user = await User.findById(id)
      .select('-password')
      .populate('approvedBy', 'name role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// @route   PUT /api/users/:id/approve
// @desc    Approve user account
// @access  Private (Staff only)
router.put('/:id/approve', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  canManageUsers,
  logActivity('user_approval', 'user')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    // Update user status
    user.status = 'active';
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    // Send approval notification
    try {
      await notificationService.sendAccountApprovalNotice(user, req.user._id);
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId: user._id,
        name: user.name,
        status: user.status,
        approvedBy: req.user.name,
        approvedAt: user.approvedAt
      }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user'
    });
  }
});

// @route   PUT /api/users/:id/reject
// @desc    Reject user account
// @access  Private (Staff only)
router.put('/:id/reject', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  canManageUsers,
  body('reason').notEmpty().withMessage('Rejection reason is required'),
  logActivity('user_rejection', 'user')
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

    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an active user'
      });
    }

    // Update user status
    user.status = 'inactive';
    user.rejectionReason = reason;
    user.rejectedBy = req.user._id;
    user.rejectedAt = new Date();
    await user.save();

    // Send rejection notification
    try {
      await notificationService.sendNotification({
        user,
        type: 'account_rejected',
        title: 'Account Registration Rejected',
        message: `Dear ${user.name}, your account registration has been rejected. Reason: ${reason}. Please contact the library staff for more information.`,
        channels: ['email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
    }

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        userId: user._id,
        name: user.name,
        status: user.status,
        reason,
        rejectedBy: req.user.name,
        rejectedAt: user.rejectedAt
      }
    });

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user'
    });
  }
});

// @route   PUT /api/users/:id/suspend
// @desc    Suspend user account
// @access  Private (Staff only)
router.put('/:id/suspend', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  canManageUsers,
  body('reason').notEmpty().withMessage('Suspension reason is required'),
  logActivity('user_suspension', 'user')
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

    const { id } = req.params;
    const { reason, duration } = req.body; // duration in days

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'User is already suspended'
      });
    }

    // Update user status
    user.status = 'suspended';
    user.suspensionReason = reason;
    user.suspendedBy = req.user._id;
    user.suspendedAt = new Date();
    if (duration) {
      user.suspensionEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }
    await user.save();

    // Send suspension notification
    try {
      await notificationService.sendNotification({
        user,
        type: 'account_suspended',
        title: 'Account Suspended',
        message: `Dear ${user.name}, your account has been suspended. Reason: ${reason}. ${duration ? `Suspension will end on ${user.suspensionEndsAt.toLocaleDateString()}.` : ''} Please contact the library staff for more information.`,
        channels: ['email', 'sms'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Failed to send suspension notification:', error);
    }

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: {
        userId: user._id,
        name: user.name,
        status: user.status,
        reason,
        suspendedBy: req.user.name,
        suspendedAt: user.suspendedAt,
        suspensionEndsAt: user.suspensionEndsAt
      }
    });

  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user'
    });
  }
});

// @route   PUT /api/users/:id/reactivate
// @desc    Reactivate suspended user account
// @access  Private (Staff only)
router.put('/:id/reactivate', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  canManageUsers,
  logActivity('user_reactivation', 'user')
], async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'User is not suspended'
      });
    }

    // Update user status
    user.status = 'active';
    user.suspensionReason = undefined;
    user.suspendedBy = undefined;
    user.suspendedAt = undefined;
    user.suspensionEndsAt = undefined;
    await user.save();

    // Send reactivation notification
    try {
      await notificationService.sendNotification({
        user,
        type: 'account_reactivated',
        title: 'Account Reactivated',
        message: `Dear ${user.name}, your account has been reactivated. You can now access library services again.`,
        channels: ['email', 'sms'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send reactivation notification:', error);
    }

    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: {
        userId: user._id,
        name: user.name,
        status: user.status,
        reactivatedBy: req.user.name,
        reactivatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Change user role
// @access  Private (Admin/Chief Librarian only)
router.put('/:id/role', [
  authenticateToken,
  requireRole('admin', 'chief_librarian'),
  body('newRole').isIn(['junior_member', 'adult_member', 'librarian', 'chief_librarian']).withMessage('Invalid role'),
  body('reason').notEmpty().withMessage('Role change reason is required'),
  logActivity('user_role_change', 'user')
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

    const { id } = req.params;
    const { newRole, reason } = req.body;

    // Chief Librarian cannot promote to admin
    if (req.user.role === 'chief_librarian' && newRole === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chief Librarians cannot promote users to Admin'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = newRole;
    user.roleChangeHistory = user.roleChangeHistory || [];
    user.roleChangeHistory.push({
      from: oldRole,
      to: newRole,
      reason,
      changedBy: req.user._id,
      changedAt: new Date()
    });
    await user.save();

    // Send role change notification
    try {
      await notificationService.sendNotification({
        user,
        type: 'role_changed',
        title: 'Role Changed',
        message: `Dear ${user.name}, your role has been changed from ${oldRole} to ${newRole}. Reason: ${reason}.`,
        channels: ['email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send role change notification:', error);
    }

    res.json({
      success: true,
      message: 'User role changed successfully',
      data: {
        userId: user._id,
        name: user.name,
        oldRole,
        newRole,
        reason,
        changedBy: req.user.name,
        changedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change user role'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (Staff or self)
router.put('/:id', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().trim().isLength({ min: 10, max: 15 }),
  logActivity('user_update', 'user')
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

    const { id } = req.params;
    const { name, phone } = req.body;

    // Users can only update their own profile unless they're staff
    if (req.user.role === 'guest' || req.user.role === 'junior_member' || req.user.role === 'adult_member') {
      if (id !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile'
        });
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private (Admin only)
router.delete('/:id', [
  authenticateToken,
  requireRole('admin'),
  logActivity('user_deletion', 'user')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has active borrows or fines
    // This would require additional models and checks

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId: id,
        name: user.name,
        deletedBy: req.user.name,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity summary
// @access  Private (Staff or self)
router.get('/:id/activity', [
  authenticateToken,
  logActivity('user_activity_view', 'user')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own activity unless they're staff
    if (req.user.role === 'guest' || req.user.role === 'junior_member' || req.user.role === 'adult_member') {
      if (id !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own activity'
        });
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // This would aggregate data from borrows, fines, etc.
    // For now, return basic user stats
    const activity = {
      userId: user._id,
      name: user.name,
      role: user.role,
      status: user.status,
      joinedAt: user.createdAt,
      lastLogin: user.lastLogin,
      fineBalance: user.fineBalance,
      maxBooksAllowed: user.maxBooksAllowed,
      currentBooksBorrowed: user.currentBooksBorrowed,
      // Additional stats would be calculated here
    };

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

export default router;
