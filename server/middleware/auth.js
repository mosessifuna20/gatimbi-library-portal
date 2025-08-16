import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// Verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    if (!user.isActive || user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is not active' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Role-based access control
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user can access book type
export const canAccessBookType = (bookType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!req.user.canAccessBookType(bookType)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied to ${bookType} books` 
      });
    }

    next();
  };
};

// Check if user can manage other users
export const canManageUsers = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const { role } = req.user;
  const targetRole = req.body.role || req.params.role;

  // Admin can manage everyone
  if (role === 'admin') {
    return next();
  }

  // Chief Librarian can manage librarians and members
  if (role === 'chief_librarian') {
    if (['admin', 'chief_librarian'].includes(targetRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot manage users of equal or higher role' 
      });
    }
    return next();
  }

  // Librarian can only manage members
  if (role === 'librarian') {
    if (['admin', 'chief_librarian', 'librarian'].includes(targetRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot manage staff users' 
      });
    }
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Insufficient permissions to manage users' 
      });
};

// Check if user can manage books
export const canManageBooks = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const { role } = req.user;
  
  if (['admin', 'chief_librarian'].includes(role)) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Only Chief Librarian and Admin can manage books' 
  });
};

// Check if user can manage fines
export const canManageFines = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const { role } = req.user;
  
  if (['admin', 'chief_librarian', 'librarian'].includes(role)) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Only staff can manage fines' 
  });
};

// Check if user can view audit logs
export const canViewAudits = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const { role } = req.user;
  
  if (role === 'admin') {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Only Admin can view audit logs' 
  });
};

// Log user activity
export const logActivity = (action, entity = 'system') => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to capture response
    res.send = function(data) {
      const executionTime = Date.now() - startTime;
      
      // Log the activity asynchronously
      if (req.user) {
        AuditLog.create({
          user: req.user._id,
          action,
          entity,
          details: `${action} performed by ${req.user.name} (${req.user.role})`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          status: res.statusCode < 400 ? 'success' : 'failure',
          executionTime,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode
          }
        }).catch(err => console.error('Error logging activity:', err));
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Rate limiting for authentication attempts
export const authRateLimit = (req, res, next) => {
  // This would typically use a rate limiting library
  // For now, we'll implement a simple check
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Store attempts in memory (in production, use Redis)
  if (!req.app.locals.authAttempts) {
    req.app.locals.authAttempts = new Map();
  }
  
  const attempts = req.app.locals.authAttempts.get(clientIP) || 0;
  
  if (attempts > 5) { // Max 5 attempts per IP
    return res.status(429).json({ 
      success: false, 
      message: 'Too many authentication attempts. Please try again later.' 
    });
  }
  
  req.app.locals.authAttempts.set(clientIP, attempts + 1);
  
  // Reset after 15 minutes
  setTimeout(() => {
    req.app.locals.authAttempts.delete(clientIP);
  }, 15 * 60 * 1000);
  
  next();
};
