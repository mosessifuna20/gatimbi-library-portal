import express from 'express';
import { body, validationResult } from 'express-validator';
import Borrow from '../models/Borrow.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { 
  authenticateToken, 
  requireRole, 
  canManageFines,
  logActivity 
} from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// @route   GET /api/borrows
// @desc    Get borrows (filtered by user role)
// @access  Private
router.get('/', [
  authenticateToken,
  logActivity('borrow_list_view', 'borrow')
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

    const borrows = await Borrow.find(query)
      .populate('user', 'name email phone')
      .populate('book', 'title author subject')
      .populate('issuedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Borrow.countDocuments(query);

    res.json({
      success: true,
      data: {
        borrows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBorrows: total,
          hasNext: skip + borrows.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get borrows error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch borrows'
    });
  }
});

// @route   POST /api/borrows/reserve
// @desc    Reserve a book
// @access  Private (Staff only)
router.post('/reserve', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('bookId').notEmpty().withMessage('Book ID is required'),
  logActivity('book_reservation', 'borrow')
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

    const { userId, bookId, notes } = req.body;

    // Check if user exists and is active
    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book || !book.isActive || book.availableCopies === 0) {
      return res.status(400).json({
        success: false,
        message: 'Book not available for reservation'
      });
    }

    // Check if user already has a reservation for this book
    const existingReservation = await Borrow.findOne({
      user: userId,
      book: bookId,
      type: 'reservation',
      status: 'active'
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: 'User already has a reservation for this book'
      });
    }

    // Create reservation
    const borrow = new Borrow({
      user: userId,
      book: bookId,
      type: 'reservation',
      issuedBy: req.user._id,
      notes
    });

    await borrow.save();

    // Send reservation notification
    try {
      await notificationService.sendNotification({
        user,
        type: 'reservation_created',
        title: 'Book Reserved',
        message: `Your reservation for "${book.title}" has been created. Please collect it within 24 hours.`,
        channels: ['email', 'sms'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send reservation notification:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Book reserved successfully',
      data: {
        reservationId: borrow._id,
        userId: user.name,
        bookTitle: book.title,
        reservedUntil: borrow.reservedUntil
      }
    });

  } catch (error) {
    console.error('Reserve book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve book'
    });
  }
});

// @route   POST /api/borrows/issue
// @desc    Issue a book to user
// @access  Private (Staff only)
router.post('/issue', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('bookId').notEmpty().withMessage('Book ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  logActivity('book_issue', 'borrow')
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

    const { userId, bookId, dueDate, notes } = req.body;

    // Check if user exists and is active
    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book || !book.isActive || book.availableCopies === 0) {
      return res.status(400).json({
        success: false,
        message: 'Book not available for borrowing'
      });
    }

    // Check if book is borrowable
    if (!book.isBorrowable) {
      return res.status(400).json({
        success: false,
        message: 'This book type cannot be borrowed'
      });
    }

    // Check user's borrowing limits
    if (user.currentBooksBorrowed >= user.maxBooksAllowed) {
      return res.status(400).json({
        success: false,
        message: 'User has reached maximum borrowing limit'
      });
    }

    // Check if user has outstanding fines
    if (user.fineBalance > 0) {
      return res.status(400).json({
        success: false,
        message: 'User has outstanding fines and cannot borrow books'
      });
    }

    // Create borrow record
    const borrow = new Borrow({
      user: userId,
      book: bookId,
      type: 'borrowed',
      borrowedAt: new Date(),
      dueDate: new Date(dueDate),
      issuedBy: req.user._id,
      notes
    });

    await borrow.save();

    // Update book availability
    await book.updateAvailableCopies(-1);

    // Update user's borrowed count
    await User.findByIdAndUpdate(userId, {
      $inc: { currentBooksBorrowed: 1 }
    });

    // Send due date reminder (scheduled)
    try {
      // Schedule reminder for 2 days before due date
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 2);
      
      // This would be handled by a scheduled task
      console.log(`Scheduling reminder for ${user.name} on ${reminderDate}`);
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Book issued successfully',
      data: {
        borrowId: borrow._id,
        userId: user.name,
        bookTitle: book.title,
        dueDate: borrow.dueDate,
        issuedBy: req.user.name
      }
    });

  } catch (error) {
    console.error('Issue book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to issue book'
    });
  }
});

// @route   POST /api/borrows/return
// @desc    Return a borrowed book
// @access  Private (Staff only)
router.post('/return', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  body('borrowId').notEmpty().withMessage('Borrow ID is required'),
  logActivity('book_return', 'borrow')
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

    const { borrowId, notes } = req.body;

    // Find borrow record
    const borrow = await Borrow.findById(borrowId)
      .populate('user', 'name currentBooksBorrowed')
      .populate('book', 'title');

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: 'Borrow record not found'
      });
    }

    if (borrow.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Book has already been returned'
      });
    }

    // Update borrow record
    borrow.status = 'completed';
    borrow.returnedAt = new Date();
    borrow.returnedBy = req.user._id;
    if (notes) borrow.notes = notes;
    await borrow.save();

    // Update book availability
    await borrow.book.updateAvailableCopies(1);

    // Update user's borrowed count
    await User.findByIdAndUpdate(borrow.user._id, {
      $inc: { currentBooksBorrowed: -1 }
    });

    // Check if book was overdue and create fine if necessary
    if (borrow.dueDate && new Date() > borrow.dueDate) {
      // This would trigger fine creation
      console.log(`Book "${borrow.book.title}" returned overdue by ${borrow.user.name}`);
    }

    res.json({
      success: true,
      message: 'Book returned successfully',
      data: {
        borrowId: borrow._id,
        userId: borrow.user.name,
        bookTitle: borrow.book.title,
        returnedAt: borrow.returnedAt,
        returnedBy: req.user.name
      }
    });

  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to return book'
    });
  }
});

// @route   GET /api/borrows/overdue
// @desc    Get overdue books
// @access  Private (Staff only)
router.get('/overdue', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  logActivity('overdue_books_view', 'borrow')
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const overdueBorrows = await Borrow.find({
      type: 'borrowed',
      status: 'active',
      dueDate: { $lt: new Date() }
    })
      .populate('user', 'name email phone')
      .populate('book', 'title author subject')
      .populate('issuedBy', 'name')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Borrow.countDocuments({
      type: 'borrowed',
      status: 'active',
      dueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        overdueBorrows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOverdue: total,
          hasNext: skip + overdueBorrows.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get overdue books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue books'
    });
  }
});

export default router;
