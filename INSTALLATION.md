# Gatimbi Library Portal - Installation Guide

## Prerequisites

Before installing the Gatimbi Library Portal, ensure you have the following installed on your system:

### Required Software
- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v6.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

### Optional Software
- **MongoDB Compass** (GUI for MongoDB) - [Download here](https://www.mongodb.com/try/download/compass)
- **Postman** (API testing) - [Download here](https://www.postman.com/downloads/)

## Installation Steps

### 1. Install Node.js

#### Windows
1. Download the LTS version from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Restart your computer to ensure PATH is updated
4. Verify installation by opening a new PowerShell/Command Prompt:
   ```bash
   node --version
   npm --version
   ```

#### Alternative: Using Chocolatey
```bash
choco install nodejs
```

#### Alternative: Using Winget (Windows 10/11)
```bash
winget install OpenJS.NodeJS
```

### 2. Install MongoDB

#### Windows
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Choose "Complete" installation
4. Install MongoDB Compass if prompted
5. MongoDB will be installed as a Windows service

#### Alternative: Using Chocolatey
```bash
choco install mongodb
```

### 3. Clone the Repository
```bash
git clone <repository-url>
cd gatimbi-library-portal
```

### 4. Install Dependencies

#### Backend Dependencies
```bash
cd server
npm install
```

#### Frontend Dependencies
```bash
cd ../client
npm install
```

### 5. Environment Configuration

#### Backend Environment
1. Copy the environment template:
   ```bash
   cd server
   copy env.example .env
   ```

2. Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/gatimbi-library
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # Admin Setup
   ADMIN_EMAIL=admin@gatimbi-library.com
   ADMIN_PHONE=+254700000000
   ADMIN_INITIAL_PASSWORD=admin123
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@gatimbi-library.com
   
   # SMS Configuration (Safaricom)
   SAFARICOM_API_KEY=your-safaricom-api-key
   SAFARICOM_API_SECRET=your-safaricom-api-secret
   SAFARICOM_SHORT_CODE=your-short-code
   
   # Client URL
   CLIENT_URL=http://localhost:3000
   
   # File Upload
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Security
   BCRYPT_ROUNDS=12
   SESSION_SECRET=your-session-secret-here
   
   # Logging
   LOG_LEVEL=info
   LOG_FILE=./logs/app.log
   
   # Backup
   BACKUP_ENABLED=true
   BACKUP_PATH=./backups
   BACKUP_RETENTION_DAYS=30
   
   # Notifications
   NOTIFICATION_BATCH_SIZE=50
   NOTIFICATION_DELAY_MS=1000
   
   # Default Fine Configuration
   DEFAULT_GRACE_PERIOD_HOURS=24
   DEFAULT_FINE_RATE_PER_HOUR=5
   DEFAULT_FINE_RATE_PER_DAY=100
   DEFAULT_LOST_BOOK_MULTIPLIER=2
   ```

#### Frontend Environment
1. Create `.env` file in the client directory:
   ```bash
   cd client
   echo "VITE_API_URL=http://localhost:5000/api" > .env
   ```

### 6. Database Setup

#### Start MongoDB Service
```bash
# Windows (if installed as service)
net start MongoDB

# Or start manually
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"
```

#### Initialize the System
```bash
cd server
npm run setup
```

This will:
- Connect to MongoDB
- Create the first admin user
- Set up default system configurations
- Create necessary database indexes

### 7. Start the Application

#### Start Backend Server
```bash
cd server
npm run dev
```

The server will start on `http://localhost:5000`

#### Start Frontend Development Server
```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:3000`

### 8. Verify Installation

#### Backend Health Check
```bash
curl http://localhost:5000/api/admin/health
```

#### Frontend Access
Open your browser and navigate to `http://localhost:3000`

## Default Credentials

After running the setup script, you can log in with:

- **Email**: `admin@gatimbi-library.com`
- **Password**: `admin123`

⚠️ **Important**: Change this password immediately after first login!

## Configuration Options

### Fine System
- **Grace Period**: Hours before fines start accumulating
- **Hourly Rate**: Fine amount per hour after grace period
- **Daily Rate**: Fine amount per day after grace period
- **Lost Book Multiplier**: Multiplier for lost book fines

### Borrowing Limits
- **Junior Members**: Maximum 2 books
- **Adult Members**: Maximum 5 books
- **Loan Period**: Default 14 days
- **Reservation Hold**: 48 hours

### Notifications
- **Due Date Reminder**: 24 hours before due date
- **Overdue Reminder**: 24 hours after due date
- **Batch Size**: 50 notifications per batch
- **Delay**: 1 second between notifications

## Troubleshooting

### Common Issues

#### 1. Node.js Not Found
```bash
# Error: 'node' is not recognized
# Solution: Restart your computer after Node.js installation
# Or manually add Node.js to PATH
```

#### 2. MongoDB Connection Failed
```bash
# Error: MongoDB connection failed
# Solution: Ensure MongoDB service is running
net start MongoDB
```

#### 3. Port Already in Use
```bash
# Error: Port 5000 is already in use
# Solution: Change PORT in .env file or kill the process using the port
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

#### 4. Dependencies Installation Failed
```bash
# Error: npm install failed
# Solution: Clear npm cache and try again
npm cache clean --force
npm install
```

#### 5. Environment Variables Not Loading
```bash
# Error: Environment variables not found
# Solution: Ensure .env file is in the correct directory
# Check file permissions and syntax
```

### Getting Help

If you encounter issues not covered in this guide:

1. Check the console logs for error messages
2. Verify all prerequisites are installed correctly
3. Ensure environment variables are set properly
4. Check MongoDB connection and permissions
5. Review the README.md for additional information

## Next Steps

After successful installation:

1. **Configure SMS Service**: Set up Safaricom SMS API credentials
2. **Configure Email Service**: Set up SMTP credentials for email notifications
3. **Customize Settings**: Adjust fine rates, borrowing limits, and other configurations
4. **Add Books**: Start adding books to the library catalog
5. **Register Users**: Begin registering library members
6. **Test Features**: Verify all functionality works as expected

## Security Considerations

1. **Change Default Passwords**: Update admin and default user passwords
2. **Secure JWT Secret**: Use a strong, unique JWT secret
3. **Environment Variables**: Never commit .env files to version control
4. **Database Access**: Restrict MongoDB access to application only
5. **Rate Limiting**: Adjust rate limiting based on your needs
6. **HTTPS**: Use HTTPS in production environments

## Production Deployment

For production deployment:

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use MongoDB Atlas or dedicated MongoDB server
3. **HTTPS**: Configure SSL/TLS certificates
4. **Process Manager**: Use PM2 or similar for Node.js process management
5. **Monitoring**: Set up application monitoring and logging
6. **Backup**: Configure automated database backups
7. **Updates**: Keep dependencies updated regularly

## Support

For additional support:

- Check the project documentation
- Review the API endpoints in the routes
- Examine the database models and schemas
- Test individual components in isolation
- Use the audit logs for debugging

---

🎉 **Congratulations!** You've successfully installed the Gatimbi Library Portal. The system is now ready to manage your community library in Meru, Kenya.
