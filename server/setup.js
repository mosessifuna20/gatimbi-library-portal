import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import SystemConfig from './models/SystemConfig.js';

dotenv.config();

const setupSystem = async () => {
  try {
    console.log('🚀 Starting Gatimbi Library Portal setup...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Skipping admin creation.');
    } else {
      // Create default admin user
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const adminUser = new User({
        name: 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@gatimbi-library.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        phone: process.env.ADMIN_PHONE || '+254700000000',
        nationalId: 'ADMIN001',
        isApproved: true,
        approvedBy: null,
        approvedAt: new Date()
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  Please change this password after first login!');
    }
    
    // Create default system configurations
    const defaultConfigs = [
      {
        category: 'fines',
        key: 'grace_period_hours',
        value: '24',
        description: 'Grace period in hours before fines start accumulating',
        type: 'number'
      },
      {
        category: 'fines',
        key: 'fine_rate_per_hour',
        value: '5',
        description: 'Fine amount per hour after grace period (in KES)',
        type: 'number'
      },
      {
        category: 'fines',
        key: 'fine_rate_per_day',
        value: '100',
        description: 'Fine amount per day after grace period (in KES)',
        type: 'number'
      },
      {
        category: 'fines',
        key: 'lost_book_multiplier',
        value: '2',
        description: 'Multiplier for lost book fines (2x book value)',
        type: 'number'
      },
      {
        category: 'borrowing',
        key: 'max_books_junior',
        value: '2',
        description: 'Maximum books a junior member can borrow',
        type: 'number'
      },
      {
        category: 'borrowing',
        key: 'max_books_adult',
        value: '5',
        description: 'Maximum books an adult member can borrow',
        type: 'number'
      },
      {
        category: 'borrowing',
        key: 'loan_period_days',
        value: '14',
        description: 'Default loan period in days',
        type: 'number'
      },
      {
        category: 'reservations',
        key: 'reservation_hold_hours',
        value: '48',
        description: 'Hours to hold a reservation before auto-release',
        type: 'number'
      },
      {
        category: 'notifications',
        key: 'due_date_reminder_hours',
        value: '24',
        description: 'Hours before due date to send reminder',
        type: 'number'
      },
      {
        category: 'notifications',
        key: 'overdue_reminder_hours',
        value: '24',
        description: 'Hours after due date to send overdue reminder',
        type: 'number'
      },
      {
        category: 'system',
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable/disable maintenance mode',
        type: 'boolean'
      },
      {
        category: 'system',
        key: 'max_login_attempts',
        value: '5',
        description: 'Maximum failed login attempts before lockout',
        type: 'number'
      },
      {
        category: 'system',
        key: 'lockout_duration_minutes',
        value: '30',
        description: 'Account lockout duration in minutes',
        type: 'number'
      }
    ];
    
    // Check and create missing configurations
    for (const config of defaultConfigs) {
      const existingConfig = await SystemConfig.findOne({ 
        category: config.category, 
        key: config.key 
      });
      
      if (!existingConfig) {
        const newConfig = new SystemConfig(config);
        await newConfig.save();
        console.log(`✅ Created config: ${config.category}.${config.key}`);
      } else {
        console.log(`ℹ️  Config already exists: ${config.category}.${config.key}`);
      }
    }
    
    // Create sample data for testing (optional)
    if (process.env.CREATE_SAMPLE_DATA === 'true') {
      console.log('📚 Creating sample data...');
      
      // Create sample books
      const sampleBooks = [
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          subject: 'Literature',
          isbn: '978-0743273565',
          type: 'book',
          audience: 'adult',
          price: 1500,
          copies: { total: 3, available: 3, borrowed: 0 },
          publicationDate: new Date('1925-04-10'),
          accessNumber: 'BK001'
        },
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          subject: 'Literature',
          isbn: '978-0446310789',
          type: 'book',
          audience: 'adult',
          price: 1200,
          copies: { total: 2, available: 2, borrowed: 0 },
          publicationDate: new Date('1960-07-11'),
          accessNumber: 'BK002'
        },
        {
          title: 'Harry Potter and the Philosopher\'s Stone',
          author: 'J.K. Rowling',
          subject: 'Fantasy',
          isbn: '978-0747532699',
          type: 'book',
          audience: 'junior',
          price: 1800,
          copies: { total: 4, available: 4, borrowed: 0 },
          publicationDate: new Date('1997-06-26'),
          accessNumber: 'BK003'
        }
      ];
      
      // Note: You would need to import the Book model here if creating sample books
      console.log('ℹ️  Sample books data structure created (import Book model to actually create)');
    }
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start the server: npm run dev');
    console.log('3. Access the admin panel with the credentials above');
    console.log('4. Configure your environment variables');
    console.log('5. Set up SMS and email services');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSystem();
}

export default setupSystem;
