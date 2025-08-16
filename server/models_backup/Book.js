import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  bookType: {
    type: String,
    enum: ['book', 'newspaper', 'kasneb'],
    required: true,
    default: 'book'
  },
  audience: {
    type: String,
    enum: ['junior', 'adult', 'all'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalCopies: {
    type: Number,
    required: true,
    min: 1
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0
  },
  datePublished: {
    type: Date,
    required: true
  },
  publisher: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    default: 'General Section'
  },
  isBorrowable: {
    type: Boolean,
    default: function() {
      // Kasneb materials are not borrowable
      return this.bookType !== 'kasneb';
    }
  },
  maxBorrowDays: {
    type: Number,
    default: function() {
      if (this.bookType === 'kasneb') return 0;
      if (this.bookType === 'newspaper') return 1;
      return 14; // Default for books
    }
  },
  qrCode: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Statistics
  totalBorrows: {
    type: Number,
    default: 0
  },
  currentBorrows: {
    type: Number,
    default: 0
  },
  overdueCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for availability status
bookSchema.virtual('availabilityStatus').get(function() {
  if (this.availableCopies === 0) return 'unavailable';
  if (this.availableCopies <= this.totalCopies * 0.2) return 'low';
  return 'available';
});

// Method to check if book can be borrowed
bookSchema.methods.canBeBorrowed = function() {
  return this.isBorrowable && this.availableCopies > 0 && this.isActive;
};

// Method to update available copies
bookSchema.methods.updateAvailableCopies = function(change) {
  this.availableCopies = Math.max(0, Math.min(this.totalCopies, this.availableCopies + change));
  return this.save();
};

// Index for search optimization
bookSchema.index({ title: 'text', author: 'text', subject: 'text' });
bookSchema.index({ audience: 1, bookType: 1, isActive: 1 });

const Book = mongoose.model('Book', bookSchema);

export default Book;
