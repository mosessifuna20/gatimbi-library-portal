import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrow',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['overdue', 'lost', 'damaged', 'reservation_expired'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  waivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  waivedAt: {
    type: Date,
    default: null
  },
  waiverReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  // Fine calculation details
  baseAmount: {
    type: Number,
    required: true
  },
  rateType: {
    type: String,
    enum: ['per_hour', 'per_day', 'fixed'],
    default: 'per_day'
  },
  rate: {
    type: Number,
    required: true,
    default: 50 // Default 50 KES per day
  },
  gracePeriod: {
    type: Number,
    default: 0 // Days of grace period
  },
  overdueDays: {
    type: Number,
    default: 0
  },
  // For lost books
  bookValue: {
    type: Number,
    default: 0
  },
  replacementCost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for calculating total fine with interest
fineSchema.virtual('totalAmount').get(function() {
  if (this.status === 'paid' || this.status === 'waived') {
    return this.amount;
  }
  
  // Calculate additional interest if overdue
  if (this.type === 'overdue' && this.overdueDays > 0) {
    let additionalAmount = 0;
    
    if (this.rateType === 'per_hour') {
      additionalAmount = this.overdueDays * 24 * this.rate;
    } else if (this.rateType === 'per_day') {
      additionalAmount = this.overdueDays * this.rate;
    }
    
    return this.baseAmount + additionalAmount;
  }
  
  return this.amount;
});

// Method to check if fine is overdue
fineSchema.methods.isOverdue = function() {
  return new Date() > this.dueDate;
};

// Method to mark as paid
fineSchema.methods.markAsPaid = function(paidBy) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paidBy = paidBy;
  return this.save();
};

// Method to waive fine
fineSchema.methods.waiveFine = function(waivedBy, reason) {
  this.status = 'waived';
  this.waivedAt = new Date();
  this.waivedBy = waivedBy;
  this.waiverReason = reason;
  return this.save();
};

// Indexes for performance
fineSchema.index({ user: 1, status: 1 });
fineSchema.index({ borrow: 1 });
fineSchema.index({ dueDate: 1, status: 1 });
fineSchema.index({ type: 1, status: 1 });

const Fine = mongoose.model('Fine', fineSchema);

export default Fine;
