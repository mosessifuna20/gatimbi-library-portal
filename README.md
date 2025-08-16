# 📚 Gatimbi Library Portal

A comprehensive full-stack web portal for managing a community library in Meru, Kenya. Built with modern technologies to provide efficient library management with role-based access control, automated notifications, and comprehensive reporting.

## ✨ Features

### 🔐 User Management & Authentication
- **Role-Based Access Control**: 6 distinct user roles with specific permissions
- **Secure Registration**: Different registration flows for adults and juniors
- **Approval System**: All registrations require librarian approval
- **JWT Authentication**: Secure token-based authentication
- **Password Management**: Forgot password, reset, and change password functionality

### 👥 User Roles
- **Guest**: Browse all books without authentication
- **Junior Member**: Access junior books only (3 book limit)
- **Adult Member**: Access adult books only (5 book limit)
- **Librarian**: Register users, manage reservations, issue books, handle fines
- **Chief Librarian**: All librarian features + book management, grace periods
- **Admin**: Full system control + user promotion, audits, system settings

### 📖 Book Management
- **Comprehensive Book Data**: Title, author, subject, price, copies, publication date
- **Book Types**: Books, newspapers, and KASNEB materials
- **Audience Classification**: Junior, adult, or all ages
- **Borrowing Rules**: KASNEB materials cannot be borrowed
- **QR Code Generation**: For easy book identification
- **Bulk Import/Export**: Excel and CSV support

### 🔄 Circulation System
- **Reservation Management**: Staff-controlled reservations with 24-hour expiry
- **Borrowing Limits**: Role-based book limits
- **Auto-Release**: Unclaimed reservations automatically released
- **Due Date Tracking**: Automated overdue detection
- **Return Processing**: Staff-managed returns

### 💰 Fines & Grace Periods
- **Configurable Rates**: Per hour, per day, or fixed rates
- **Grace Periods**: Configurable grace periods before fines apply
- **Lost Book Fines**: 2× book value for lost materials
- **Fine Management**: Pay, waive, or track fine history
- **Automated Processing**: Hourly overdue fine processing

### 📱 Notifications
- **Multi-Channel**: SMS (Safaricom API), Email, and In-App
- **Automated Alerts**: Due dates, overdue notices, fine alerts
- **Account Status**: Approval confirmations, suspensions
- **Reservation Updates**: Ready notifications, expiry warnings

### 📊 Advanced Features
- **Audit Logging**: Complete system activity tracking
- **Analytics Dashboard**: Book statistics, user activity, fine reports
- **Role-Based Dashboards**: Customized views per user role
- **Reporting**: PDF and Excel export capabilities
- **System Configuration**: Fine rates, grace periods, notification settings

## 🛠 Tech Stack

### Backend
- **Node.js** with **Express.js** framework
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Nodemailer** for email notifications
- **Safaricom SMS API** integration
- **Multer** for file uploads
- **Express Validator** for input validation

### Frontend
- **React 19** with modern hooks
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **Axios** for API communication

### Development Tools
- **ESLint** for code quality
- **Vite** for fast development
- **Nodemon** for backend auto-reload
- **Concurrently** for running both servers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gatimbi-library-portal
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   cd server
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if local)
   mongod
   
   # Or use MongoDB Atlas
   # Update MONGODB_URI in .env
   ```

5. **Start Development Servers**
   ```bash
   # From root directory
   npm run dev
   
   # Or run separately:
   # Backend: cd server && npm run dev
   # Frontend: cd client && npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - Health Check: http://localhost:5000/health

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gatimbi-library

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Admin Setup
ADMIN_SETUP_CODE=GATIMBI2024

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Safaricom SMS
SAFARICOM_API_KEY=your-api-key
SAFARICOM_API_SECRET=your-api-secret
SAFARICOM_SHORT_CODE=your-short-code
```

### Initial Admin Setup

1. Start the server
2. Make a POST request to `/api/auth/register-admin` with:
   ```json
   {
     "name": "Admin User",
     "email": "admin@gatimbi-library.com",
     "phone": "254700000000",
     "password": "securepassword123",
     "nationalId": "12345678",
     "adminCode": "GATIMBI2024"
   }
   ```

## 📁 Project Structure

```
gatimbi-library-portal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── context/       # React context
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── server/                # Node.js backend
│   ├── config/           # Database and app configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/register-staff` - Staff registration
- `POST /api/auth/register-admin` - Admin registration
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users` - Get all users (staff only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/approve` - Approve user account
- `PUT /api/users/:id/role` - Change user role
- `DELETE /api/users/:id` - Delete user

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Add new book (staff only)
- `GET /api/books/:id` - Get book by ID
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `POST /api/books/bulk-import` - Bulk import books
- `GET /api/books/export` - Export books

### Borrows
- `GET /api/borrows` - Get borrows (filtered by role)
- `POST /api/borrows/reserve` - Reserve book
- `POST /api/borrows/issue` - Issue book
- `POST /api/borrows/return` - Return book
- `PUT /api/borrows/:id` - Update borrow

### Fines
- `GET /api/fines` - Get fines
- `POST /api/fines/:id/pay` - Pay fine
- `POST /api/fines/:id/waive` - Waive fine
- `GET /api/fines/stats` - Fine statistics

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/audit-logs` - System audit logs
- `GET /api/admin/system-config` - System configuration
- `PUT /api/admin/system-config` - Update system configuration

## 🎯 Key Features Implementation

### Role-Based Access Control
- Middleware-based permission checking
- Route-level access control
- Content filtering based on user role

### Automated Notifications
- Scheduled task processing
- Multi-channel delivery (SMS, Email, In-App)
- Template-based messaging

### Fine Management
- Configurable fine rates and grace periods
- Automated overdue fine calculation
- Fine payment and waiver processing

### Audit Logging
- Comprehensive activity tracking
- Performance monitoring
- Security event logging

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd client
npm run build

# Backend
cd server
npm start
```

### Environment Variables
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure production MongoDB
- Set up production email and SMS services

### Security Considerations
- Enable HTTPS
- Set secure cookie options
- Implement rate limiting
- Use environment variables for secrets
- Regular security updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Machine learning insights
- **Integration**: Payment gateway integration
- **Multi-language**: Swahili and other local languages
- **Offline Support**: Progressive Web App features
- **Advanced Reporting**: Custom report builder

---

**Built with ❤️ for the Gatimbi Community Library**
