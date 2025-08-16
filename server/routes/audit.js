import express from 'express';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Get all audit logs (Admin, Chief Librarian only)
router.get('/', authenticateToken, requireRole(['admin', 'chief_librarian']), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, userId, severity, startDate, endDate } = req.query;
    
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (userId) filter.userId = userId;
    if (severity) filter.severity = severity;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'name email role' },
        { path: 'relatedUserId', select: 'name email role' }
      ]
    };

    const auditLogs = await AuditLog.paginate(filter, options);
    
    await logActivity(req.user.id, 'view', 'audit_logs', null, 'Viewed audit logs');
    
    res.json({
      success: true,
      data: auditLogs.docs,
      pagination: {
        page: auditLogs.page,
        totalPages: auditLogs.totalPages,
        totalDocs: auditLogs.totalDocs,
        hasNext: auditLogs.hasNextPage,
        hasPrev: auditLogs.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Get audit logs for a specific user (Admin, Chief Librarian, or own logs)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Users can only view their own logs unless they're admin/chief librarian
    if (req.user.role !== 'admin' && req.user.role !== 'chief_librarian' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'relatedUserId', select: 'name email role' }
      ]
    };

    const auditLogs = await AuditLog.paginate({ userId }, options);
    
    await logActivity(req.user.id, 'view', 'audit_logs', userId, 'Viewed user audit logs');
    
    res.json({
      success: true,
      data: auditLogs.docs,
      pagination: {
        page: auditLogs.page,
        totalPages: auditLogs.totalPages,
        totalDocs: auditLogs.totalDocs,
        hasNext: auditLogs.hasNextPage,
        hasPrev: auditLogs.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user audit logs' });
  }
});

// Get audit logs for a specific entity (Admin, Chief Librarian only)
router.get('/entity/:entity/:entityId', authenticateToken, requireRole(['admin', 'chief_librarian']), async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'name email role' },
        { path: 'relatedUserId', select: 'name email role' }
      ]
    };

    const auditLogs = await AuditLog.paginate({ entity, entityId }, options);
    
    await logActivity(req.user.id, 'view', 'audit_logs', null, `Viewed audit logs for ${entity}:${entityId}`);
    
    res.json({
      success: true,
      data: auditLogs.docs,
      pagination: {
        page: auditLogs.page,
        totalPages: auditLogs.totalPages,
        totalDocs: auditLogs.totalDocs,
        hasNext: auditLogs.hasNextPage,
        hasPrev: auditLogs.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch entity audit logs' });
  }
});

// Get audit statistics (Admin, Chief Librarian only)
router.get('/stats', authenticateToken, requireRole(['admin', 'chief_librarian']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            action: '$action',
            severity: '$severity',
            entity: '$entity'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          details: {
            $push: {
              severity: '$_id.severity',
              entity: '$_id.entity',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    const totalLogs = await AuditLog.countDocuments(dateFilter);
    const failedLogs = await AuditLog.countDocuments({ ...dateFilter, status: 'failed' });
    const highSeverityLogs = await AuditLog.countDocuments({ ...dateFilter, severity: 'high' });
    
    await logActivity(req.user.id, 'view', 'audit_logs', null, 'Viewed audit statistics');
    
    res.json({
      success: true,
      data: {
        totalLogs,
        failedLogs,
        highSeverityLogs,
        actionBreakdown: stats,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit statistics' });
  }
});

// Export audit logs (Admin, Chief Librarian only)
router.get('/export', authenticateToken, requireRole(['admin', 'chief_librarian']), async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, action, entity, userId } = req.query;
    
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .populate('relatedUserId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      
      // CSV header
      const csvHeader = 'Timestamp,Action,Entity,Entity ID,User,Related User,Details,IP Address,User Agent,Status,Severity\n';
      res.write(csvHeader);
      
      // CSV rows
      auditLogs.forEach(log => {
        const row = [
          log.createdAt.toISOString(),
          log.action,
          log.entity || '',
          log.entityId || '',
          log.userId ? `${log.userId.name} (${log.userId.email})` : '',
          log.relatedUserId ? `${log.relatedUserId.name} (${log.relatedUserId.email})` : '',
          `"${log.details || ''}"`,
          log.ipAddress || '',
          `"${log.userAgent || ''}"`,
          log.status,
          log.severity
        ].join(',');
        res.write(row + '\n');
      });
      
      res.end();
    } else {
      res.json({
        success: true,
        data: auditLogs,
        count: auditLogs.length
      });
    }
    
    await logActivity(req.user.id, 'export', 'audit_logs', null, `Exported audit logs in ${format} format`);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to export audit logs' });
  }
});

export default router;
