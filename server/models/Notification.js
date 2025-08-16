import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'due_date_reminder',
      'overdue_notice',
      'reservation_ready',
      'reservation_expired',
      'fine_notice',
      'account_approved',
      'account_suspended',
      'book_returned',
      'fine_paid',
      'fine_waived'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  channels: [{
    type: String,
    enum: ['sms', 'email', 'in_app'],
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // SMS specific fields
  smsStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  smsMessageId: {
    type: String,
    default: null
  },
  smsCost: {
    type: Number,
    default: 0
  },
  // Email specific fields
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  emailMessageId: {
    type: String,
    default: null
  },
  // Related entities
  relatedBook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    default: null
  },
  relatedBorrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrow',
    default: null
  },
  relatedFine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine',
    default: null
  },
  // Scheduling
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    trim: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  // Metadata
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = now - created;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to mark as sent
notificationSchema.methods.markAsSent = function(channel) {
  if (channel === 'sms') {
    this.smsStatus = 'sent';
    this.smsMessageId = this.smsMessageId || `sms_${Date.now()}`;
  } else if (channel === 'email') {
    this.emailStatus = 'sent';
    this.emailMessageId = this.emailMessageId || `email_${Date.now()}`;
  }
  
  if (this.smsStatus === 'sent' && this.emailStatus === 'sent') {
    this.status = 'sent';
    this.sentAt = new Date();
  }
  
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function(channel) {
  if (channel === 'sms') {
    this.smsStatus = 'delivered';
  } else if (channel === 'email') {
    this.emailStatus = 'delivered';
  }
  
  if (this.smsStatus === 'delivered' && this.emailStatus === 'delivered') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  }
  
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function(channel, reason) {
  if (channel === 'sms') {
    this.smsStatus = 'failed';
  } else if (channel === 'email') {
    this.emailStatus = 'failed';
  }
  
  this.failureReason = reason;
  this.failedAt = new Date();
  
  if (this.retryCount < this.maxRetries) {
    this.retryCount += 1;
    this.status = 'pending';
  } else {
    this.status = 'failed';
  }
  
  return this.save();
};

// Indexes for performance
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ channels: 1, status: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
