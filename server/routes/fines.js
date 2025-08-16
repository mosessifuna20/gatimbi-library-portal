import express from 'express';
import { body, validationResult } from 'express-validator';
import Fine from '../models/Fine.js';
import { 
  authenticateToken, 
  requireRole, 
  canManageFines,
  logActivity 
} from '../middleware/auth.js';
import fineService from '../services/fineService.js';

const router = express.Router();

// @route   GET /api/fines
// @desc    Get fines (filtered by user role)
// @access  Private
router.get('/', [
  authenticateToken,
  logActivity('fine_list_view', 'fine')
], async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by user role
    if (['junior_member', 'adult_member'].includes(req.user.role)) {
      query.user = req.user._id;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const fines = await Fine.find(query)
      .populate('user', 'name email phone')
      .populate('borrow', 'book')
      .populate('book', 'title author')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Fine.countDocuments(query);

    res.json({
      success: true,
      data: {
        fines,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalFines: total,
          hasNext: skip + fines.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fines'
    });
  }
});

// @route   POST /api/fines/:id/pay
// @desc    Pay a fine
// @access  Private (Staff only)
router.post('/:id/pay', [
  authenticateToken,
  canManageFines,
  body('paymentMethod').isIn(['cash', 'mpesa', 'bank']).withMessage('Valid payment method is required'),
  logActivity('fine_payment', 'fine')
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
    const { paymentMethod, receiptNumber, notes } = req.body;

    const fine = await fineService.payFine(id, req.user._id, paymentMethod, receiptNumber);

    res.json({
      success: true,
      message: 'Fine paid successfully',
      data: {
        fineId: fine._id,
        amount: fine.amount,
        paymentMethod,
        receiptNumber,
        paidBy: req.user.name,
        paidAt: fine.paidAt
      }
    });

  } catch (error) {
    console.error('Pay fine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to pay fine'
    });
  }
});

// @route   POST /api/fines/:id/waive
// @desc    Waive a fine
// @access  Private (Staff only)
router.post('/:id/waive', [
  authenticateToken,
  canManageFines,
  body('reason').notEmpty().withMessage('Waiver reason is required'),
  logActivity('fine_waiver', 'fine')
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

    const fine = await fineService.waiveFine(id, req.user._id, reason);

    res.json({
      success: true,
      message: 'Fine waived successfully',
      data: {
        fineId: fine._id,
        amount: fine.amount,
        reason,
        waivedBy: req.user.name,
        waivedAt: fine.waivedAt
      }
    });

  } catch (error) {
    console.error('Waive fine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to waive fine'
    });
  }
});

// @route   GET /api/fines/stats
// @desc    Get fine statistics
// @access  Private (Staff only)
router.get('/stats', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  logActivity('fine_stats_view', 'fine')
], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await fineService.getFineStatistics(parseInt(days));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get fine stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fine statistics'
    });
  }
});

export default router;
