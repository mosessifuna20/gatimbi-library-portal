import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import SystemConfig from '../models/SystemConfig.js';

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.smsConfig = null;
    this.init();
  }

  async init() {
    try {
      // Initialize email transporter
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      this.emailTransporter = nodemailer.createTransport(emailConfig);

      // Initialize SMS config
      this.smsConfig = {
        apiKey: process.env.SAFARICOM_API_KEY,
        apiSecret: process.env.SAFARICOM_API_SECRET,
        shortCode: process.env.SAFARICOM_SHORT_CODE,
        baseUrl: process.env.SAFARICOM_BASE_URL || 'https://api.safaricom.co.ke'
      };

      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Send SMS via Safaricom API
  async sendSMS(phoneNumber, message, priority = 'normal') {
    try {
      if (!this.smsConfig.apiKey || !this.smsConfig.apiSecret) {
        throw new Error('SMS configuration not available');
      }

      // Format phone number (remove + and add country code if needed)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Safaricom SMS API call
      const smsData = {
        phoneNumber: formattedPhone,
        message: message,
        shortCode: this.smsConfig.shortCode,
        timestamp: new Date().toISOString()
      };

      // In production, this would make an actual API call to Safaricom
      // For now, we'll simulate the response
      const response = await this.callSafaricomAPI(smsData);

      return {
        success: true,
        messageId: response.messageId,
        cost: response.cost,
        status: 'sent'
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  // Send email
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@gatimbi-library.com',
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        status: 'sent'
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  // Send notification through multiple channels
  async sendNotification(notificationData) {
    try {
      const { user, type, title, message, channels, priority = 'medium' } = notificationData;

      // Create notification record
      const notification = await Notification.create({
        user: user._id,
        type,
        title,
        message,
        channels,
        priority,
        scheduledFor: new Date()
      });

      const results = {};

      // Send through each channel
      for (const channel of channels) {
        try {
          if (channel === 'sms' && user.phone) {
            results.sms = await this.sendSMS(user.phone, message, priority);
            await notification.markAsSent('sms');
          }

          if (channel === 'email' && user.email) {
            results.email = await this.sendEmail(user.email, title, this.formatEmailContent(message, user));
            await notification.markAsSent('email');
          }

          if (channel === 'in_app') {
            results.in_app = { success: true, status: 'queued' };
          }
        } catch (error) {
          console.error(`Failed to send ${channel} notification:`, error);
          await notification.markAsFailed(channel, error.message);
          results[channel] = { success: false, error: error.message };
        }
      }

      return {
        notificationId: notification._id,
        results
      };
    } catch (error) {
      console.error('Notification sending failed:', error);
      throw error;
    }
  }

  // Send due date reminder
  async sendDueDateReminder(borrow) {
    try {
      const user = await borrow.populate('user');
      const book = await borrow.populate('book');

      const message = `Dear ${user.name}, your book "${book.title}" is due on ${new Date(borrow.dueDate).toLocaleDateString()}. Please return it on time to avoid fines.`;

      return await this.sendNotification({
        user,
        type: 'due_date_reminder',
        title: 'Book Due Date Reminder',
        message,
        channels: ['sms', 'email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Due date reminder failed:', error);
      throw error;
    }
  }

  // Send overdue notice
  async sendOverdueNotice(borrow) {
    try {
      const user = await borrow.populate('user');
      const book = await borrow.populate('book');

      const overdueDays = borrow.overdueDays;
      const message = `Dear ${user.name}, your book "${book.title}" is overdue by ${overdueDays} day(s). Please return it immediately to avoid accumulating fines.`;

      return await this.sendNotification({
        user,
        type: 'overdue_notice',
        title: 'Book Overdue Notice',
        message,
        channels: ['sms', 'email'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Overdue notice failed:', error);
      throw error;
    }
  }

  // Send fine notice
  async sendFineNotice(fine) {
    try {
      const user = await fine.populate('user');
      const borrow = await fine.populate('borrow');
      const book = await borrow.populate('book');

      const message = `Dear ${user.name}, you have a fine of KES ${fine.totalAmount} for the book "${book.title}". Please settle this fine to continue using library services.`;

      return await this.sendNotification({
        user,
        type: 'fine_notice',
        title: 'Fine Notice',
        message,
        channels: ['sms', 'email'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Fine notice failed:', error);
      throw error;
    }
  }

  // Send account approval notice
  async sendAccountApprovalNotice(user, approvedBy) {
    try {
      const approver = await User.findById(approvedBy);
      const message = `Dear ${user.name}, your account has been approved by ${approver.name}. You can now log in and start using the library services.`;

      return await this.sendNotification({
        user,
        type: 'account_approved',
        title: 'Account Approved',
        message,
        channels: ['sms', 'email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Account approval notice failed:', error);
      throw error;
    }
  }

  // Send reservation ready notice
  async sendReservationReadyNotice(borrow) {
    try {
      const user = await borrow.populate('user');
      const book = await borrow.populate('book');

      const message = `Dear ${user.name}, your reserved book "${book.title}" is now available. Please collect it within 24 hours or the reservation will expire.`;

      return await this.sendNotification({
        user,
        type: 'reservation_ready',
        title: 'Reservation Ready',
        message,
        channels: ['sms', 'email'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Reservation ready notice failed:', error);
      throw error;
    }
  }

  // Helper methods
  formatPhoneNumber(phone) {
    let formatted = phone.replace(/\s+/g, '');
    
    // Remove + if present
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    
    // Add 254 country code if not present
    if (!formatted.startsWith('254') && formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    }
    
    return formatted;
  }

  formatEmailContent(message, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Gatimbi Library Portal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Gatimbi Library Portal</h1>
          </div>
          <div class="content">
            <p>${message}</p>
            <p>Best regards,<br>Gatimbi Library Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async callSafaricomAPI(smsData) {
    // Simulate Safaricom API call
    // In production, implement actual API integration
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          cost: 1.5,
          status: 'sent'
        });
      }, 100);
    });
  }

  // Get notification statistics
  async getNotificationStats(userId = null, days = 30) {
    try {
      const matchStage = {};
      if (userId) {
        matchStage.user = userId;
      }
      
      const stats = await Notification.aggregate([
        { $match: matchStage },
        { $match: { createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: {
              type: '$type',
              status: '$status',
              channel: { $arrayElemAt: ['$channels', 0] }
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return [];
    }
  }
}

export default new NotificationService();
