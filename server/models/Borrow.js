import mongoose from 'mongoose';

const borrowSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  type: {
    type: String,
    enum: ['reservation', 'borrowed', 'returned', 'overdue', 'lost'],
    default: 'reservation'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'overdue'],
    default: 'active'
  },
  reservedAt: {
    type: Date,
    default: Date.now
  },
  reservedUntil: {
    type: Date,
    default: function() {
      // Reservation expires in 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  borrowedAt: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  returnedAt: {
    type: Date,
    default: null
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  finePaid: {
    type: Boolean,
    default: false
  },
  finePaidAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For lost books
  isLost: {
    type: Boolean,
    default: false
  },
  lostAt: {
    type: Date,
    default: null
  },
  replacementCost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for calculating overdue days
borrowSchema.virtual('overdueDays').get(function() {
  if (!this.dueDate || this.status === 'completed') return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for calculating fine amount
borrowSchema.virtual('calculatedFine').get(function() {
  if (this.isLost) {
    return this.replacementCost * 2; // 2x book value for lost books
  }
  
  if (this.overdueDays > 0) {
    // Fine calculation will be handled by the fine service
    return this.fineAmount;
  }
  
  return 0;
});

// Method to check if reservation has expired
borrowSchema.methods.isReservationExpired = function() {
  if (this.type !== 'reservation') return false;
  return new Date() > this.reservedUntil;
};

// Method to check if book is overdue
borrowSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
};

// Method to mark as overdue
borrowSchema.methods.markAsOverdue = function() {
  if (this.isOverdue()) {
    this.status = 'overdue';
    this.type = 'overdue';
    return this.save();
  }
  return Promise.resolve(this);
};

// Indexes for performance
borrowSchema.index({ user: 1, status: 1 });
borrowSchema.index({ book: 1, status: 1 });
borrowSchema.index({ dueDate: 1, status: 1 });
borrowSchema.index({ reservedUntil: 1, type: 1 });

const Borrow = mongoose.model('Borrow', borrowSchema);

export default Borrow;
