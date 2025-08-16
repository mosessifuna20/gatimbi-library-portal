import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  entity: {
    type: String,
    required: true,
    enum: [
      'user', 'book', 'borrow', 'fine', 'notification', 'system', 'auth'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: String,
    required: true,
    trim: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  // For failed actions
  errorMessage: {
    type: String,
    default: null
  },
  errorStack: {
    type: String,
    default: null
  },
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Session info
  sessionId: {
    type: String,
    default: null
  },
  // Related entities for complex operations
  relatedEntities: [{
    entity: String,
    entityId: mongoose.Schema.Types.ObjectId,
    action: String
  }],
  // Performance metrics
  executionTime: {
    type: Number, // in milliseconds
    default: null
  },
  // Location info (if available)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true
});

// Virtual for human-readable action
auditLogSchema.virtual('readableAction').get(function() {
  const actionMap = {
    'user_login': 'User Login',
    'user_logout': 'User Logout',
    'user_register': 'User Registration',
    'user_update': 'User Update',
    'user_delete': 'User Deletion',
    'user_role_change': 'User Role Change',
    'book_add': 'Book Added',
    'book_update': 'Book Updated',
    'book_delete': 'Book Deleted',
    'book_borrow': 'Book Borrowed',
    'book_return': 'Book Returned',
    'book_reserve': 'Book Reserved',
    'fine_create': 'Fine Created',
    'fine_pay': 'Fine Paid',
    'fine_waive': 'Fine Waived',
    'notification_send': 'Notification Sent',
    'system_config_change': 'System Configuration Changed',
    'bulk_import': 'Bulk Import',
    'bulk_export': 'Bulk Export',
    'audit_report': 'Audit Report Generated'
  };
  
  return actionMap[this.action] || this.action;
});

// Method to add related entity
auditLogSchema.methods.addRelatedEntity = function(entity, entityId, action) {
  this.relatedEntities.push({ entity, entityId, action });
  return this.save();
};

// Method to mark as failed
auditLogSchema.methods.markAsFailed = function(error, severity = 'medium') {
  this.status = 'failure';
  this.severity = severity;
  this.errorMessage = error.message || error;
  this.errorStack = error.stack || null;
  return this.save();
};

// Indexes for performance and querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ status: 1, severity: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
