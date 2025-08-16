import express from 'express';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Borrow from '../models/Borrow.js';
import Fine from '../models/Fine.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SystemConfig from '../models/SystemConfig.js';
import moment from 'moment';

const router = express.Router();

// All routes require admin role
router.use(authenticateToken, requireRole(['admin']));

// Get admin dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const today = moment().startOf('day');
    const thisMonth = moment().startOf('month');
    const lastMonth = moment().subtract(1, 'month').startOf('month');

    // User statistics
    const totalUsers = await User.countDocuments();
    const pendingApprovals = await User.countDocuments({ status: 'pending' });
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thisMonth.toDate() }
    });
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: lastMonth.toDate(), $lt: thisMonth.toDate() }
    });

    // Book statistics
    const totalBooks = await Book.countDocuments();
    const availableBooks = await Book.countDocuments({ 'copies.available': { $gt: 0 } });
    const borrowedBooks = await Book.countDocuments({ 'copies.borrowed': { $gt: 0 } });
    const totalCopies = await Book.aggregate([
      { $group: { _id: null, total: { $sum: '$copies.total' } } }
    ]);

    // Borrow statistics
    const totalBorrows = await Borrow.countDocuments();
    const activeBorrows = await Borrow.countDocuments({ status: 'borrowed' });
    const overdueBorrows = await Borrow.countDocuments({ status: 'overdue' });
    const reservations = await Borrow.countDocuments({ status: 'reserved' });
    
    const borrowsThisMonth = await Borrow.countDocuments({
      issuedAt: { $gte: thisMonth.toDate() }
    });
    const borrowsLastMonth = await Borrow.countDocuments({
      issuedAt: { $gte: lastMonth.toDate(), $lt: thisMonth.toDate() }
    });

    // Fine statistics
    const totalFines = await Fine.countDocuments();
    const pendingFines = await Fine.countDocuments({ status: 'pending' });
    const paidFines = await Fine.countDocuments({ status: 'paid' });
    const waivedFines = await Fine.countDocuments({ status: 'waived' });
    
    const totalFineAmount = await Fine.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingFineAmount = await Fine.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Notification statistics
    const totalNotifications = await Notification.countDocuments();
    const sentNotifications = await Notification.countDocuments({ status: 'sent' });
    const failedNotifications = await Notification.countDocuments({ status: 'failed' });

    // System activity
    const recentAuditLogs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const systemConfig = await SystemConfig.findOne({ category: 'fines' });

    await logActivity(req.user.id, 'view', 'admin_dashboard', null, 'Viewed admin dashboard');

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          pendingApprovals,
          active: activeUsers,
          suspended: suspendedUsers,
          newThisMonth: newUsersThisMonth,
          newLastMonth: newUsersLastMonth,
          growthRate: lastMonth > 0 ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1) : 0
        },
        books: {
          total: totalBooks,
          available: availableBooks,
          borrowed: borrowedBooks,
          totalCopies: totalCopies[0]?.total || 0,
          utilizationRate: totalCopies[0]?.total > 0 ? ((borrowedBooks / totalCopies[0].total) * 100).toFixed(1) : 0
        },
        borrows: {
          total: totalBorrows,
          active: activeBorrows,
          overdue: overdueBorrows,
          reservations,
          thisMonth: borrowsThisMonth,
          lastMonth: borrowsLastMonth,
          growthRate: borrowsLastMonth > 0 ? ((borrowsThisMonth - borrowsLastMonth) / borrowsLastMonth * 100).toFixed(1) : 0
        },
        fines: {
          total: totalFines,
          pending: pendingFines,
          paid: paidFines,
          waived: waivedFines,
          totalAmount: totalFineAmount[0]?.total || 0,
          pendingAmount: pendingFineAmount[0]?.total || 0
        },
        notifications: {
          total: totalNotifications,
          sent: sentNotifications,
          failed: failedNotifications,
          successRate: totalNotifications > 0 ? ((sentNotifications / totalNotifications) * 100).toFixed(1) : 0
        },
        system: {
          recentActivity: recentAuditLogs,
          fineConfig: systemConfig
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const configs = await SystemConfig.find().sort({ category: 1, key: 1 });
    
    await logActivity(req.user.id, 'view', 'system_config', null, 'Viewed system configuration');
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system configuration' });
  }
});

// Update system configuration
router.put('/config/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { value, description } = req.body;

    const config = await SystemConfig.findByIdAndUpdate(
      configId,
      { value, description, updatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    await logActivity(req.user.id, 'update', 'system_config', configId, `Updated ${config.key} to ${value}`);

    res.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({ success: false, message: 'Failed to update configuration' });
  }
});

// Get user analytics
router.get('/analytics/users', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = moment();
      switch (period) {
        case 'week':
          dateFilter.createdAt = { $gte: now.subtract(1, 'week').toDate() };
          break;
        case 'month':
          dateFilter.createdAt = { $gte: now.subtract(1, 'month').toDate() };
          break;
        case 'quarter':
          dateFilter.createdAt = { $gte: now.subtract(3, 'months').toDate() };
          break;
        case 'year':
          dateFilter.createdAt = { $gte: now.subtract(1, 'year').toDate() };
          break;
      }
    }

    // User registration trends
    const userTrends = await User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Role distribution
    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Status distribution
    const statusDistribution = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // School distribution (for junior members)
    const schoolDistribution = await User.aggregate([
      { $match: { role: 'junior_member', 'guardianDetails.school': { $exists: true } } },
      { $group: { _id: '$guardianDetails.school', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    await logActivity(req.user.id, 'view', 'user_analytics', null, 'Viewed user analytics');

    res.json({
      success: true,
      data: {
        userTrends,
        roleDistribution,
        statusDistribution,
        schoolDistribution,
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user analytics' });
  }
});

// Get book analytics
router.get('/analytics/books', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = moment();
      switch (period) {
        case 'week':
          dateFilter.createdAt = { $gte: now.subtract(1, 'week').toDate() };
          break;
        case 'month':
          dateFilter.createdAt = { $gte: now.subtract(1, 'month').toDate() };
          break;
        case 'quarter':
          dateFilter.createdAt = { $gte: now.subtract(3, 'months').toDate() };
          break;
        case 'year':
          dateFilter.createdAt = { $gte: now.subtract(1, 'year').toDate() };
          break;
      }
    }

    // Book addition trends
    const bookTrends = await Book.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Book type distribution
    const typeDistribution = await Book.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Audience distribution
    const audienceDistribution = await Book.aggregate([
      { $group: { _id: '$audience', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most borrowed books
    const mostBorrowed = await Book.aggregate([
      {
        $lookup: {
          from: 'borrows',
          localField: '_id',
          foreignField: 'bookId',
          as: 'borrows'
        }
      },
      {
        $addFields: {
          borrowCount: { $size: '$borrows' }
        }
      },
      { $sort: { borrowCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          title: 1,
          author: 1,
          type: 1,
          audience: 1,
          borrowCount: 1
        }
      }
    ]);

    await logActivity(req.user.id, 'view', 'book_analytics', null, 'Viewed book analytics');

    res.json({
      success: true,
      data: {
        bookTrends,
        typeDistribution,
        audienceDistribution,
        mostBorrowed,
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching book analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch book analytics' });
  }
});

// Get financial analytics
router.get('/analytics/financial', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = moment();
      switch (period) {
        case 'week':
          dateFilter.createdAt = { $gte: now.subtract(1, 'week').toDate() };
          break;
        case 'month':
          dateFilter.createdAt = { $gte: now.subtract(1, 'month').toDate() };
          break;
        case 'quarter':
          dateFilter.createdAt = { $gte: now.subtract(3, 'months').toDate() };
          break;
        case 'year':
          dateFilter.createdAt = { $gte: now.subtract(1, 'year').toDate() };
          break;
      }
    }

    // Fine trends
    const fineTrends = await Fine.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Fine type distribution
    const fineTypeDistribution = await Fine.aggregate([
      { $group: { _id: '$type', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } }
    ]);

    // Fine status distribution
    const fineStatusDistribution = await Fine.aggregate([
      { $group: { _id: '$status', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } }
    ]);

    // Monthly revenue
    const monthlyRevenue = await Fine.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    await logActivity(req.user.id, 'view', 'financial_analytics', null, 'Viewed financial analytics');

    res.json({
      success: true,
      data: {
        fineTrends,
        fineTypeDistribution,
        fineStatusDistribution,
        monthlyRevenue,
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch financial analytics' });
  }
});

// Get system health status
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {}
    };

    // Database connection check
    try {
      const dbStatus = await User.db.db.admin().ping();
      health.checks.database = { status: 'healthy', response: dbStatus };
    } catch (error) {
      health.checks.database = { status: 'unhealthy', error: error.message };
      health.status = 'degraded';
    }

    // Check for critical issues
    const criticalIssues = [];
    
    // Check for overdue books
    const overdueCount = await Borrow.countDocuments({ status: 'overdue' });
    if (overdueCount > 0) {
      criticalIssues.push(`${overdueCount} overdue books`);
    }

    // Check for pending fines
    const pendingFinesCount = await Fine.countDocuments({ status: 'pending' });
    if (pendingFinesCount > 0) {
      criticalIssues.push(`${pendingFinesCount} pending fines`);
    }

    // Check for failed notifications
    const failedNotificationsCount = await Notification.countDocuments({ status: 'failed' });
    if (failedNotificationsCount > 0) {
      criticalIssues.push(`${failedNotificationsCount} failed notifications`);
    }

    // Check for pending user approvals
    const pendingApprovalsCount = await User.countDocuments({ status: 'pending' });
    if (pendingApprovalsCount > 0) {
      criticalIssues.push(`${pendingApprovalsCount} pending user approvals`);
    }

    health.checks.criticalIssues = criticalIssues;
    if (criticalIssues.length > 0) {
      health.status = 'attention_required';
    }

    await logActivity(req.user.id, 'view', 'system_health', null, 'Viewed system health status');

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ success: false, message: 'Failed to check system health' });
  }
});

export default router;
