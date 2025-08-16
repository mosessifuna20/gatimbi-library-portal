import express from 'express';
import { body, validationResult } from 'express-validator';
import Book from '../models/Book.js';
import { 
  authenticateToken, 
  requireRole, 
  canManageBooks, 
  canAccessBookType,
  logActivity 
} from '../middleware/auth.js';
import QRCode from 'qrcode';

const router = express.Router();

// @route   GET /api/books
// @desc    Get all books (filtered by user role)
// @access  Public (with role-based filtering)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      author, 
      subject, 
      bookType, 
      audience, 
      available,
      sortBy = 'title',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = { isActive: true };

    // Role-based filtering
    if (req.headers.authorization) {
      try {
        // This is a simplified approach - in production, use proper JWT verification
        const token = req.headers.authorization.split(' ')[1];
        // For now, we'll allow all books for authenticated users
        // In production, implement proper role checking
      } catch (error) {
        // Guest users see all books
      }
    }

    // Add filters
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }

    if (author) query.author = { $regex: author, $options: 'i' };
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (bookType) query.bookType = bookType;
    if (audience) query.audience = audience;
    if (available === 'true') query.availableCopies = { $gt: 0 };
    if (available === 'false') query.availableCopies = 0;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const books = await Book.find(query)
      .populate('addedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Book.countDocuments(query);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBooks: total,
          hasNext: skip + books.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books'
    });
  }
});

// @route   GET /api/books/:id
// @desc    Get book by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id)
      .populate('addedBy', 'name role');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });

  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book'
    });
  }
});

// @route   POST /api/books
// @desc    Add new book
// @access  Private (Chief Librarian/Admin only)
router.post('/', [
  authenticateToken,
  canManageBooks,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('author').trim().isLength({ min: 1, max: 100 }).withMessage('Author is required and must be less than 100 characters'),
  body('subject').trim().isLength({ min: 1, max: 100 }).withMessage('Subject is required and must be less than 100 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('totalCopies').isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('datePublished').isISO8601().withMessage('Valid publication date is required'),
  body('bookType').isIn(['book', 'newspaper', 'kasneb']).withMessage('Invalid book type'),
  body('audience').isIn(['junior', 'adult', 'all']).withMessage('Invalid audience'),
  logActivity('book_add', 'book')
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

    const {
      title, author, subject, isbn, bookType, audience, price,
      totalCopies, datePublished, publisher, description, location, tags
    } = req.body;

    // Check if ISBN already exists
    if (isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }
    }

    // Generate QR code
    let qrCode = null;
    try {
      qrCode = await QRCode.toDataURL(`BOOK:${title}:${author}:${Date.now()}`);
    } catch (error) {
      console.error('QR code generation failed:', error);
    }

    // Create book
    const book = new Book({
      title,
      author,
      subject,
      isbn,
      bookType,
      audience,
      price,
      totalCopies,
      availableCopies: totalCopies,
      datePublished,
      publisher,
      description,
      location,
      tags,
      qrCode,
      addedBy: req.user._id
    });

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: {
        bookId: book._id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        qrCode: book.qrCode
      }
    });

  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add book'
    });
  }
});

// @route   PUT /api/books/:id
// @desc    Update book
// @access  Private (Chief Librarian/Admin only)
router.put('/:id', [
  authenticateToken,
  canManageBooks,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('author').optional().trim().isLength({ min: 1, max: 100 }),
  body('subject').optional().trim().isLength({ min: 1, max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('totalCopies').optional().isInt({ min: 1 }),
  body('datePublished').optional().isISO8601(),
  logActivity('book_update', 'book')
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
    const updateData = req.body;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Update total copies and adjust available copies accordingly
    if (updateData.totalCopies !== undefined) {
      const difference = updateData.totalCopies - book.totalCopies;
      updateData.availableCopies = Math.max(0, book.availableCopies + difference);
    }

    // Update book
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name role');

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update book'
    });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete book (soft delete)
// @access  Private (Chief Librarian/Admin only)
router.delete('/:id', [
  authenticateToken,
  canManageBooks,
  logActivity('book_delete', 'book')
], async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book has active borrows
    // This would require additional models and checks

    // Soft delete
    book.isActive = false;
    await book.save();

    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: {
        bookId: id,
        title: book.title,
        deletedBy: req.user.name,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book'
    });
  }
});

// @route   POST /api/books/bulk-import
// @desc    Bulk import books from Excel/CSV
// @access  Private (Chief Librarian/Admin only)
router.post('/bulk-import', [
  authenticateToken,
  canManageBooks,
  logActivity('bulk_book_import', 'book')
], async (req, res) => {
  try {
    // This would handle file upload and parsing
    // For now, we'll accept JSON data
    const { books } = req.body;

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Books array is required and must not be empty'
      });
    }

    const results = {
      total: books.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const bookData of books) {
      try {
        // Validate book data
        if (!bookData.title || !bookData.author || !bookData.subject) {
          results.failed++;
          results.errors.push(`Book ${bookData.title || 'Unknown'}: Missing required fields`);
          continue;
        }

        // Check for duplicates
        if (bookData.isbn) {
          const existingBook = await Book.findOne({ isbn: bookData.isbn });
          if (existingBook) {
            results.failed++;
            results.errors.push(`Book ${bookData.title}: ISBN ${bookData.isbn} already exists`);
            continue;
          }
        }

        // Generate QR code
        let qrCode = null;
        try {
          qrCode = await QRCode.toDataURL(`BOOK:${bookData.title}:${bookData.author}:${Date.now()}`);
        } catch (error) {
          console.error('QR code generation failed:', error);
        }

        // Create book
        const book = new Book({
          ...bookData,
          qrCode,
          addedBy: req.user._id,
          isActive: true
        });

        await book.save();
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Book ${bookData.title || 'Unknown'}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Bulk import completed',
      data: results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk import'
    });
  }
});

// @route   GET /api/books/export
// @desc    Export books to Excel/CSV
// @access  Private (Chief Librarian/Admin only)
router.get('/export', [
  authenticateToken,
  canManageBooks,
  logActivity('book_export', 'book')
], async (req, res) => {
  try {
    const { format = 'csv', filters } = req.query;

    // Build query based on filters
    let query = { isActive: true };
    if (filters) {
      try {
        const filterObj = JSON.parse(filters);
        Object.assign(query, filterObj);
      } catch (error) {
        console.error('Invalid filters format:', error);
      }
    }

    const books = await Book.find(query)
      .populate('addedBy', 'name')
      .sort({ title: 1 });

    if (format === 'csv') {
      // Generate CSV
      const csvData = books.map(book => ({
        Title: book.title,
        Author: book.author,
        Subject: book.subject,
        ISBN: book.isbn || '',
        Type: book.bookType,
        Audience: book.audience,
        Price: book.price,
        TotalCopies: book.totalCopies,
        AvailableCopies: book.availableCopies,
        Publisher: book.publisher || '',
        PublishedDate: book.datePublished.toISOString().split('T')[0],
        Location: book.location,
        AddedBy: book.addedBy?.name || '',
        AddedDate: book.createdAt.toISOString().split('T')[0]
      }));

      // Convert to CSV string
      const headers = Object.keys(csvData[0]);
      const csv = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=books_${Date.now()}.csv`);
      res.send(csv);

    } else {
      // Return JSON
      res.json({
        success: true,
        data: books
      });
    }

  } catch (error) {
    console.error('Export books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export books'
    });
  }
});

// @route   GET /api/books/search/advanced
// @desc    Advanced book search
// @access  Public
router.get('/search/advanced', async (req, res) => {
  try {
    const { 
      query, 
      filters, 
      page = 1, 
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let searchQuery = { isActive: true };

    // Text search
    if (query) {
      searchQuery.$text = { $search: query };
    }

    // Apply filters
    if (filters) {
      try {
        const filterObj = JSON.parse(filters);
        Object.assign(searchQuery, filterObj);
      } catch (error) {
        console.error('Invalid filters format:', error);
      }
    }

    // Build sort object
    let sort = {};
    if (sortBy === 'relevance' && query) {
      // Text search relevance
      sort = { score: { $meta: 'textScore' } };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const books = await Book.find(searchQuery)
      .populate('addedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Book.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBooks: total,
          hasNext: skip + books.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// @route   GET /api/books/stats/overview
// @desc    Get book statistics overview
// @access  Private (Staff only)
router.get('/stats/overview', [
  authenticateToken,
  requireRole('librarian', 'chief_librarian', 'admin'),
  logActivity('book_stats_view', 'book')
], async (req, res) => {
  try {
    const stats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBooks: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' },
          totalValue: { $sum: { $multiply: ['$price', '$totalCopies'] } },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    const bookTypeStats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$bookType',
          count: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' }
        }
      }
    ]);

    const audienceStats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$audience',
          count: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' }
        }
      }
    ]);

    const subjectStats = await Book.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        byType: bookTypeStats,
        byAudience: audienceStats,
        topSubjects: subjectStats
      }
    });

  } catch (error) {
    console.error('Get book stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book statistics'
    });
  }
});

export default router;
