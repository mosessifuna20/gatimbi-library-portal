import express from 'express';
import { authenticateToken, requireRole, logActivity } from '../middleware/auth.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Borrow from '../models/Borrow.js';
import Fine from '../models/Fine.js';
import Notification from '../models/Notification.js';
import moment from 'moment';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = express.Router();

// All routes require admin or chief librarian role
router.use(authenticateToken, requireRole(['admin', 'chief_librarian']));

// Generate user report
router.get('/users', async (req, res) => {
  try {
    const { format = 'json', status, role, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users_report_${new Date().toISOString().split('T')[0]}.csv`);
      
      // CSV header
      const csvHeader = 'Name,Email,Role,Status,National ID/Birth Certificate,Phone,School,Guardian Name,Guardian Phone,Guardian Email,Guardian ID,Registration Date,Last Login\n';
      res.write(csvHeader);
      
      // CSV rows
      users.forEach(user => {
        const row = [
          user.name,
          user.email,
          user.role,
          user.status,
          user.nationalId || user.birthCertificate || '',
          user.phone || '',
          user.guardianDetails?.school || '',
          user.guardianDetails?.name || '',
          user.guardianDetails?.phone || '',
          user.guardianDetails?.email || '',
          user.guardianDetails?.nationalId || '',
          user.createdAt.toISOString().split('T')[0],
          user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : ''
        ].map(field => `"${field || ''}"`).join(',');
        res.write(row + '\n');
      });
      
      res.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'National ID/Birth Certificate', key: 'id', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'School', key: 'school', width: 20 },
        { header: 'Guardian Name', key: 'guardianName', width: 20 },
        { header: 'Guardian Phone', key: 'guardianPhone', width: 15 },
        { header: 'Guardian Email', key: 'guardianEmail', width: 25 },
        { header: 'Guardian ID', key: 'guardianId', width: 20 },
        { header: 'Registration Date', key: 'registrationDate', width: 15 },
        { header: 'Last Login', key: 'lastLogin', width: 15 }
      ];
      
      // Add data
      users.forEach(user => {
        worksheet.addRow({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          id: user.nationalId || user.birthCertificate || '',
          phone: user.phone || '',
          school: user.guardianDetails?.school || '',
          guardianName: user.guardianDetails?.name || '',
          guardianPhone: user.guardianDetails?.phone || '',
          guardianEmail: user.guardianDetails?.email || '',
          guardianId: user.guardianDetails?.nationalId || '',
          registrationDate: user.createdAt.toISOString().split('T')[0],
          lastLogin: user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : ''
        });
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=users_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({
        success: true,
        data: users,
        count: users.length
      });
    }
    
    await logActivity(req.user.id, 'export', 'user_report', null, `Exported user report in ${format} format`);
  } catch (error) {
    console.error('Error generating user report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate user report' });
  }
});

// Generate book report
router.get('/books', async (req, res) => {
  try {
    const { format = 'json', type, audience, status } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (audience) filter.audience = audience;
    if (status === 'available') filter['copies.available'] = { $gt: 0 };
    if (status === 'borrowed') filter['copies.borrowed'] = { $gt: 0 };

    const books = await Book.find(filter)
      .sort({ title: 1 })
      .lean();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=books_report_${new Date().toISOString().split('T')[0]}.csv`);
      
      // CSV header
      const csvHeader = 'Title,Author,Subject,ISBN,Type,Audience,Price,Total Copies,Available Copies,Borrowed Copies,Publication Date,Access Number\n';
      res.write(csvHeader);
      
      // CSV rows
      books.forEach(book => {
        const row = [
          book.title,
          book.author,
          book.subject,
          book.isbn || '',
          book.type,
          book.audience,
          book.price || '',
          book.copies.total,
          book.copies.available,
          book.copies.borrowed,
          book.publicationDate ? book.publicationDate.toISOString().split('T')[0] : '',
          book.accessNumber || ''
        ].map(field => `"${field || ''}"`).join(',');
        res.write(row + '\n');
      });
      
      res.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Books Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Author', key: 'author', width: 25 },
        { header: 'Subject', key: 'subject', width: 20 },
        { header: 'ISBN', key: 'isbn', width: 15 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Audience', key: 'audience', width: 12 },
        { header: 'Price', key: 'price', width: 12 },
        { header: 'Total Copies', key: 'totalCopies', width: 15 },
        { header: 'Available Copies', key: 'availableCopies', width: 18 },
        { header: 'Borrowed Copies', key: 'borrowedCopies', width: 18 },
        { header: 'Publication Date', key: 'publicationDate', width: 15 },
        { header: 'Access Number', key: 'accessNumber', width: 15 }
      ];
      
      // Add data
      books.forEach(book => {
        worksheet.addRow({
          title: book.title,
          author: book.author,
          subject: book.subject,
          isbn: book.isbn || '',
          type: book.type,
          audience: book.audience,
          price: book.price || '',
          totalCopies: book.copies.total,
          availableCopies: book.copies.available,
          borrowedCopies: book.copies.borrowed,
          publicationDate: book.publicationDate ? book.publicationDate.toISOString().split('T')[0] : '',
          accessNumber: book.accessNumber || ''
        });
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=books_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({
        success: true,
        data: books,
        count: books.length
      });
    }
    
    await logActivity(req.user.id, 'export', 'book_report', null, `Exported book report in ${format} format`);
  } catch (error) {
    console.error('Error generating book report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate book report' });
  }
});

// Generate borrowing report
router.get('/borrows', async (req, res) => {
  try {
    const { format = 'json', status, startDate, endDate, userId } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.issuedAt = {};
      if (startDate) filter.issuedAt.$gte = new Date(startDate);
      if (endDate) filter.issuedAt.$lte = new Date(endDate);
    }

    const borrows = await Borrow.find(filter)
      .populate('userId', 'name email role')
      .populate('bookId', 'title author accessNumber')
      .populate('issuedBy', 'name')
      .populate('returnedBy', 'name')
      .sort({ issuedAt: -1 })
      .lean();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=borrows_report_${new Date().toISOString().split('T')[0]}.csv`);
      
      // CSV header
      const csvHeader = 'User,Book,Access Number,Status,Issued Date,Due Date,Returned Date,Issued By,Returned By,Fine Amount\n';
      res.write(csvHeader);
      
      // CSV rows
      borrows.forEach(borrow => {
        const row = [
          borrow.userId ? `${borrow.userId.name} (${borrow.userId.email})` : '',
          borrow.bookId ? borrow.bookId.title : '',
          borrow.bookId ? borrow.bookId.accessNumber : '',
          borrow.status,
          borrow.issuedAt ? borrow.issuedAt.toISOString().split('T')[0] : '',
          borrow.dueDate ? borrow.dueDate.toISOString().split('T')[0] : '',
          borrow.returnedAt ? borrow.returnedAt.toISOString().split('T')[0] : '',
          borrow.issuedBy ? borrow.issuedBy.name : '',
          borrow.returnedBy ? borrow.returnedBy.name : '',
          borrow.fineAmount || ''
        ].map(field => `"${field || ''}"`).join(',');
        res.write(row + '\n');
      });
      
      res.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Borrows Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'User', key: 'user', width: 30 },
        { header: 'Book', key: 'book', width: 30 },
        { header: 'Access Number', key: 'accessNumber', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Issued Date', key: 'issuedDate', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Returned Date', key: 'returnedDate', width: 15 },
        { header: 'Issued By', key: 'issuedBy', width: 20 },
        { header: 'Returned By', key: 'returnedBy', width: 20 },
        { header: 'Fine Amount', key: 'fineAmount', width: 15 }
      ];
      
      // Add data
      borrows.forEach(borrow => {
        worksheet.addRow({
          user: borrow.userId ? `${borrow.userId.name} (${borrow.userId.email})` : '',
          book: borrow.bookId ? borrow.bookId.title : '',
          accessNumber: borrow.bookId ? borrow.bookId.accessNumber : '',
          status: borrow.status,
          issuedDate: borrow.issuedAt ? borrow.issuedAt.toISOString().split('T')[0] : '',
          dueDate: borrow.dueDate ? borrow.dueDate.toISOString().split('T')[0] : '',
          returnedDate: borrow.returnedAt ? borrow.returnedAt.toISOString().split('T')[0] : '',
          issuedBy: borrow.issuedBy ? borrow.issuedBy.name : '',
          returnedBy: borrow.returnedBy ? borrow.returnedBy.name : '',
          fineAmount: borrow.fineAmount || ''
        });
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=borrows_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({
        success: true,
        data: borrows,
        count: borrows.length
      });
    }
    
    await logActivity(req.user.id, 'export', 'borrow_report', null, `Exported borrow report in ${format} format`);
  } catch (error) {
    console.error('Error generating borrow report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate borrow report' });
  }
});

// Generate fine report
router.get('/fines', async (req, res) => {
  try {
    const { format = 'json', status, type, startDate, endDate, userId } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const fines = await Fine.find(filter)
      .populate('userId', 'name email role')
      .populate('borrowId', 'bookId')
      .populate('borrowId.bookId', 'title accessNumber')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fines_report_${new Date().toISOString().split('T')[0]}.csv`);
      
      // CSV header
      const csvHeader = 'User,Book,Access Number,Fine Type,Amount,Status,Due Date,Paid Date,Waived Date,Description\n';
      res.write(csvHeader);
      
      // CSV rows
      fines.forEach(fine => {
        const row = [
          fine.userId ? `${fine.userId.name} (${fine.userId.email})` : '',
          fine.borrowId?.bookId ? fine.borrowId.bookId.title : '',
          fine.borrowId?.bookId ? fine.borrowId.bookId.accessNumber : '',
          fine.type,
          fine.amount,
          fine.status,
          fine.dueDate ? fine.dueDate.toISOString().split('T')[0] : '',
          fine.paidAt ? fine.paidAt.toISOString().split('T')[0] : '',
          fine.waivedAt ? fine.waivedAt.toISOString().split('T')[0] : '',
          fine.description || ''
        ].map(field => `"${field || ''}"`).join(',');
        res.write(row + '\n');
      });
      
      res.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fines Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'User', key: 'user', width: 30 },
        { header: 'Book', key: 'book', width: 30 },
        { header: 'Access Number', key: 'accessNumber', width: 15 },
        { header: 'Fine Type', key: 'type', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Paid Date', key: 'paidDate', width: 15 },
        { header: 'Waived Date', key: 'waivedDate', width: 15 },
        { header: 'Description', key: 'description', width: 30 }
      ];
      
      // Add data
      fines.forEach(fine => {
        worksheet.addRow({
          user: fine.userId ? `${fine.userId.name} (${fine.userId.email})` : '',
          book: fine.borrowId?.bookId ? fine.borrowId.bookId.title : '',
          accessNumber: fine.borrowId?.bookId ? fine.borrowId.bookId.accessNumber : '',
          type: fine.type,
          amount: fine.amount,
          status: fine.status,
          dueDate: fine.dueDate ? fine.dueDate.toISOString().split('T')[0] : '',
          paidDate: fine.paidAt ? fine.paidAt.toISOString().split('T')[0] : '',
          waivedDate: fine.waivedAt ? fine.waivedAt.toISOString().split('T')[0] : '',
          description: fine.description || ''
        });
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=fines_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({
        success: true,
        data: fines,
        count: fines.length
      });
    }
    
    await logActivity(req.user.id, 'export', 'fine_report', null, `Exported fine report in ${format} format`);
  } catch (error) {
    console.error('Error generating fine report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate fine report' });
  }
});

// Generate comprehensive system report (PDF)
router.get('/system', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    // Gather comprehensive data
    const totalUsers = await User.countDocuments();
    const totalBooks = await Book.countDocuments();
    const totalBorrows = await Borrow.countDocuments();
    const totalFines = await Fine.countDocuments();
    
    const activeUsers = await User.countDocuments({ status: 'active' });
    const availableBooks = await Book.countDocuments({ 'copies.available': { $gt: 0 } });
    const activeBorrows = await Borrow.countDocuments({ status: 'borrowed' });
    const pendingFines = await Fine.countDocuments({ status: 'pending' });

    // User growth
    const userGrowth = await User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Book utilization
    const bookUtilization = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: '$copies.total' },
          borrowedCopies: { $sum: '$copies.borrowed' }
        }
      }
    ]);

    // Fine revenue
    const fineRevenue = await Fine.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Create PDF
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=system_report_${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(20).text('Gatimbi Library Portal - System Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Summary section
    doc.fontSize(16).text('System Summary');
    doc.moveDown();
    doc.fontSize(12).text(`Total Users: ${totalUsers}`);
    doc.text(`Active Users: ${activeUsers}`);
    doc.text(`Total Books: ${totalBooks}`);
    doc.text(`Available Books: ${availableBooks}`);
    doc.text(`Total Borrows: ${totalBorrows}`);
    doc.text(`Active Borrows: ${activeBorrows}`);
    doc.text(`Total Fines: ${totalFines}`);
    doc.text(`Pending Fines: ${pendingFines}`);
    doc.moveDown();
    
    // User growth chart
    if (userGrowth.length > 0) {
      doc.fontSize(14).text('User Growth Trend');
      doc.moveDown();
      userGrowth.forEach(item => {
        doc.fontSize(10).text(`${item._id}: ${item.count} new users`);
      });
      doc.moveDown();
    }
    
    // Book utilization
    if (bookUtilization.length > 0) {
      const utilization = bookUtilization[0];
      const utilizationRate = utilization.totalCopies > 0 ? 
        ((utilization.borrowedCopies / utilization.totalCopies) * 100).toFixed(1) : 0;
      
      doc.fontSize(14).text('Book Utilization');
      doc.moveDown();
      doc.fontSize(12).text(`Total Copies: ${utilization.totalCopies}`);
      doc.text(`Borrowed Copies: ${utilization.borrowedCopies}`);
      doc.text(`Utilization Rate: ${utilizationRate}%`);
      doc.moveDown();
    }
    
    // Fine revenue
    if (fineRevenue.length > 0) {
      doc.fontSize(14).text('Fine Revenue Trend');
      doc.moveDown();
      fineRevenue.forEach(item => {
        doc.fontSize(10).text(`${item._id}: KES ${item.totalAmount} (${item.count} fines)`);
      });
      doc.moveDown();
    }
    
    // End PDF
    doc.end();
    
    await logActivity(req.user.id, 'export', 'system_report', null, 'Exported comprehensive system report in PDF format');
  } catch (error) {
    console.error('Error generating system report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate system report' });
  }
});

export default router;
