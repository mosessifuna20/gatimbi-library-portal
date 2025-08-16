import Fine from '../models/Fine.js';
import Borrow from '../models/Borrow.js';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import notificationService from './notificationService.js';
import moment from 'moment';

class FineService {
  constructor() {
    this.defaultConfig = {
      gracePeriod: 2, // days
      dailyRate: 50, // KES per day
      hourlyRate: 5, // KES per hour
      maxFine: 2000, // Maximum fine amount
      lostBookMultiplier: 2 // 2x book value for lost books
    };
  }

  // Calculate fine for overdue book
  async calculateOverdueFine(borrowId) {
    try {
      const borrow = await Borrow.findById(borrowId)
        .populate('user')
        .populate('book');

      if (!borrow || borrow.status === 'completed') {
        throw new Error('Invalid borrow record or already completed');
      }

      // Get system configuration
      const gracePeriod = await SystemConfig.getValue('grace_period_days', this.defaultConfig.gracePeriod);
      const dailyRate = await SystemConfig.getValue('fine_daily_rate', this.defaultConfig.dailyRate);
      const hourlyRate = await SystemConfig.getValue('fine_hourly_rate', this.defaultConfig.hourlyRate);
      const rateType = await SystemConfig.getValue('fine_rate_type', 'per_day');

      const now = moment();
      const dueDate = moment(borrow.dueDate);
      const overdueDays = now.diff(dueDate, 'days');

      // Check if grace period applies
      if (overdueDays <= gracePeriod) {
        return { fineAmount: 0, gracePeriodUsed: true };
      }

      // Calculate fine based on rate type
      let fineAmount = 0;
      if (rateType === 'per_hour') {
        const overdueHours = now.diff(dueDate, 'hours');
        fineAmount = Math.max(0, overdueHours - (gracePeriod * 24)) * hourlyRate;
      } else {
        fineAmount = Math.max(0, overdueDays - gracePeriod) * dailyRate;
      }

      // Apply maximum fine limit
      const maxFine = await SystemConfig.getValue('max_fine_amount', this.defaultConfig.maxFine);
      fineAmount = Math.min(fineAmount, maxFine);

      return {
        fineAmount: Math.round(fineAmount * 100) / 100, // Round to 2 decimal places
        overdueDays,
        gracePeriodUsed: false,
        rateType,
        dailyRate,
        hourlyRate
      };
    } catch (error) {
      console.error('Error calculating overdue fine:', error);
      throw error;
    }
  }

  // Create fine for overdue book
  async createOverdueFine(borrowId, issuedBy) {
    try {
      const borrow = await Borrow.findById(borrowId)
        .populate('user')
        .populate('book');

      if (!borrow) {
        throw new Error('Borrow record not found');
      }

      // Check if fine already exists
      const existingFine = await Fine.findOne({ borrow: borrowId, type: 'overdue' });
      if (existingFine) {
        throw new Error('Fine already exists for this borrow');
      }

      const fineCalculation = await this.calculateOverdueFine(borrowId);
      
      if (fineCalculation.fineAmount === 0) {
        return null; // No fine needed
      }

      // Create fine record
      const fine = await Fine.create({
        user: borrow.user._id,
        borrow: borrowId,
        amount: fineCalculation.fineAmount,
        type: 'overdue',
        dueDate: moment().add(7, 'days').toDate(), // Fine due in 7 days
        baseAmount: fineCalculation.fineAmount,
        rateType: fineCalculation.rateType,
        rate: fineCalculation.rateType === 'per_hour' ? fineCalculation.hourlyRate : fineCalculation.dailyRate,
        gracePeriod: await SystemConfig.getValue('grace_period_days', this.defaultConfig.gracePeriod),
        overdueDays: fineCalculation.overdueDays
      });

      // Update user's fine balance
      await User.findByIdAndUpdate(borrow.user._id, {
        $inc: { fineBalance: fineCalculation.fineAmount }
      });

      // Send fine notice
      await notificationService.sendFineNotice(fine);

      return fine;
    } catch (error) {
      console.error('Error creating overdue fine:', error);
      throw error;
    }
  }

  // Create fine for lost book
  async createLostBookFine(borrowId, issuedBy, replacementCost = null) {
    try {
      const borrow = await Borrow.findById(borrowId)
        .populate('user')
        .populate('book');

      if (!borrow) {
        throw new Error('Borrow record not found');
      }

      // Check if fine already exists
      const existingFine = await Fine.findOne({ borrow: borrowId, type: 'lost' });
      if (existingFine) {
        throw new Error('Fine already exists for this lost book');
      }

      // Calculate replacement cost
      const bookValue = replacementCost || borrow.book.price;
      const fineAmount = bookValue * this.defaultConfig.lostBookMultiplier;

      // Create fine record
      const fine = await Fine.create({
        user: borrow.user._id,
        borrow: borrowId,
        amount: fineAmount,
        type: 'lost',
        dueDate: moment().add(14, 'days').toDate(), // Lost book fine due in 14 days
        baseAmount: fineAmount,
        rateType: 'fixed',
        rate: 0,
        bookValue,
        replacementCost: fineAmount
      });

      // Mark borrow as lost
      await Borrow.findByIdAndUpdate(borrowId, {
        isLost: true,
        lostAt: new Date(),
        status: 'completed'
      });

      // Update user's fine balance
      await User.findByIdAndUpdate(borrow.user._id, {
        $inc: { fineBalance: fineAmount }
      });

      // Send fine notice
      await notificationService.sendFineNotice(fine);

      return fine;
    } catch (error) {
      console.error('Error creating lost book fine:', error);
      throw error;
    }
  }

  // Pay fine
  async payFine(fineId, paidBy, paymentMethod = 'cash', receiptNumber = null) {
    try {
      const fine = await Fine.findById(fineId)
        .populate('user')
        .populate('borrow');

      if (!fine) {
        throw new Error('Fine not found');
      }

      if (fine.status === 'paid') {
        throw new Error('Fine is already paid');
      }

      // Mark fine as paid
      await fine.markAsPaid(paidBy);

      // Update user's fine balance
      await User.findByIdAndUpdate(fine.user._id, {
        $inc: { fineBalance: -fine.amount }
      });

      // Send payment confirmation
      await notificationService.sendNotification({
        user: fine.user,
        type: 'fine_paid',
        title: 'Fine Payment Confirmed',
        message: `Your fine of KES ${fine.amount} has been paid successfully. Thank you for settling your account.`,
        channels: ['email'],
        priority: 'medium'
      });

      return fine;
    } catch (error) {
      console.error('Error paying fine:', error);
      throw error;
    }
  }

  // Waive fine
  async waiveFine(fineId, waivedBy, reason) {
    try {
      const fine = await Fine.findById(fineId)
        .populate('user');

      if (!fine) {
        throw new Error('Fine not found');
      }

      if (fine.status === 'paid') {
        throw new Error('Cannot waive already paid fine');
      }

      // Mark fine as waived
      await fine.waiveFine(waivedBy, reason);

      // Update user's fine balance
      await User.findByIdAndUpdate(fine.user._id, {
        $inc: { fineBalance: -fine.amount }
      });

      // Send waiver notification
      await notificationService.sendNotification({
        user: fine.user,
        type: 'fine_waived',
        title: 'Fine Waived',
        message: `Your fine of KES ${fine.amount} has been waived. Reason: ${reason}`,
        channels: ['email'],
        priority: 'medium'
      });

      return fine;
    } catch (error) {
      console.error('Error waiving fine:', error);
      throw error;
    }
  }

  // Get user's fine summary
  async getUserFineSummary(userId) {
    try {
      const fines = await Fine.find({ user: userId })
        .populate('borrow')
        .populate('book');

      const summary = {
        totalFines: 0,
        paidFines: 0,
        pendingFines: 0,
        waivedFines: 0,
        overdueFines: 0,
        fines: []
      };

      fines.forEach(fine => {
        summary.totalFines += fine.amount;
        summary.fines.push(fine);

        switch (fine.status) {
          case 'paid':
            summary.paidFines += fine.amount;
            break;
          case 'pending':
            summary.pendingFines += fine.amount;
            if (fine.isOverdue()) {
              summary.overdueFines += fine.amount;
            }
            break;
          case 'waived':
            summary.waivedFines += fine.amount;
            break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting user fine summary:', error);
      throw error;
    }
  }

  // Get system-wide fine statistics
  async getFineStatistics(days = 30) {
    try {
      const startDate = moment().subtract(days, 'days').toDate();

      const stats = await Fine.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              type: '$type',
              status: '$status'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const totalFines = await Fine.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      return {
        breakdown: stats,
        total: totalFines[0] || { totalAmount: 0, averageAmount: 0 }
      };
    } catch (error) {
      console.error('Error getting fine statistics:', error);
      throw error;
    }
  }

  // Process overdue fines (cron job)
  async processOverdueFines() {
    try {
      const overdueBorrows = await Borrow.find({
        status: 'active',
        dueDate: { $lt: new Date() },
        type: 'borrowed'
      }).populate('user book');

      let processedCount = 0;

      for (const borrow of overdueBorrows) {
        try {
          // Check if fine already exists
          const existingFine = await Fine.findOne({ borrow: borrow._id, type: 'overdue' });
          if (!existingFine) {
            await this.createOverdueFine(borrow._id, borrow.issuedBy);
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing overdue fine for borrow ${borrow._id}:`, error);
        }
      }

      return { processedCount, totalOverdue: overdueBorrows.length };
    } catch (error) {
      console.error('Error processing overdue fines:', error);
      throw error;
    }
  }

  // Update fine rates and grace periods
  async updateFineConfiguration(config) {
    try {
      const updates = [];

      if (config.gracePeriod !== undefined) {
        updates.push(
          SystemConfig.setValue('grace_period_days', config.gracePeriod, 'Grace period in days for overdue fines')
        );
      }

      if (config.dailyRate !== undefined) {
        updates.push(
          SystemConfig.setValue('fine_daily_rate', config.dailyRate, 'Daily fine rate in KES')
        );
      }

      if (config.hourlyRate !== undefined) {
        updates.push(
          SystemConfig.setValue('fine_hourly_rate', config.hourlyRate, 'Hourly fine rate in KES')
        );
      }

      if (config.maxFine !== undefined) {
        updates.push(
          SystemConfig.setValue('max_fine_amount', config.maxFine, 'Maximum fine amount in KES')
        );
      }

      await Promise.all(updates);
      return { success: true, message: 'Fine configuration updated successfully' };
    } catch (error) {
      console.error('Error updating fine configuration:', error);
      throw error;
    }
  }
}

export default new FineService();
