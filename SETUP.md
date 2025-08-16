# 🚀 Gatimbi Library Portal - Setup Guide

This guide will walk you through setting up the Gatimbi Library Portal on your local machine or server.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**

### Checking Prerequisites

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version

# Check MongoDB (if local)
mongod --version
```

## 🛠 Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gatimbi-library-portal
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root directory
cd ..
```

### 3. Environment Configuration

#### Backend Environment Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Copy the environment template:
   ```bash
   cp env.example .env
   ```

3. Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/gatimbi-library
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Admin Setup
   ADMIN_SETUP_CODE=GATIMBI2024
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@gatimbi-library.com
   
   # Safaricom SMS API Configuration
   SAFARICOM_API_KEY=your-safaricom-api-key
   SAFARICOM_API_SECRET=your-safaricom-api-secret
   SAFARICOM_SHORT_CODE=your-short-code
   SAFARICOM_BASE_URL=https://api.safaricom.co.ke
   
   # Client URL
   CLIENT_URL=http://localhost:3000
   ```

#### Frontend Environment Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_APP_NAME=Gatimbi Library Portal
   ```

### 4. Database Setup

#### Option A: Local MongoDB

1. Start MongoDB service:
   ```bash
   # On Windows
   net start MongoDB
   
   # On macOS/Linux
   sudo systemctl start mongod
   
   # Or manually
   mongod
   ```

2. Create database:
   ```bash
   mongosh
   use gatimbi-library
   exit
   ```

#### Option B: MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

### 5. System Initialization

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Run the setup script:
   ```bash
   npm run setup
   ```

   This will:
   - Create default system configuration
   - Create the first admin user
   - Set up initial database structure

3. **Important**: Note the default admin credentials:
   - Email: `admin@gatimbi-library.com`
   - Password: `admin123`
   - **Change this password immediately after first login!**

### 6. Start the Application

#### Development Mode

From the root directory:
```bash
npm run dev
```

This will start both backend and frontend servers concurrently.

#### Manual Start

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔐 First Login

1. Open http://localhost:3000 in your browser
2. Click "Login"
3. Use the default admin credentials:
   - Email: `admin@gatimbi-library.com`
   - Password: `admin123`
4. **Immediately change the password** in your profile settings

## 📱 SMS and Email Configuration

### Safaricom SMS API

1. Register for Safaricom Developer account
2. Get your API credentials
3. Update the `.env` file with your credentials

### Email Configuration

1. **Gmail Setup**:
   - Enable 2-factor authentication
   - Generate an app password
   - Use the app password in `SMTP_PASS`

2. **Other SMTP Providers**:
   - Update `SMTP_HOST`, `SMTP_PORT`, and credentials
   - Test the configuration

## 🧪 Testing the Setup

### Backend Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### API Endpoints Test

```bash
# Test user registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "254700000001",
    "password": "password123",
    "role": "adult_member",
    "nationalId": "12345678"
  }'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
- Ensure MongoDB is running
- Check if the port is correct
- Verify connection string in `.env`

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
- Change the port in `.env` file
- Kill the process using the port:
  ```bash
  # Find process
  lsof -i :5000
  # Kill process
  kill -9 <PID>
  ```

#### 3. JWT Secret Error

**Error**: `JsonWebTokenError: invalid signature`

**Solution**:
- Ensure `JWT_SECRET` is set in `.env`
- Restart the server after changing the secret

#### 4. Email/SMS Not Working

**Solution**:
- Check credentials in `.env`
- Verify API keys are correct
- Check network connectivity
- Review service logs for errors

### Logs and Debugging

#### Backend Logs

```bash
cd server
npm run dev
```

Look for:
- Database connection messages
- Server startup messages
- Error messages

#### Frontend Logs

Open browser developer tools (F12):
- Console tab for JavaScript errors
- Network tab for API calls
- Application tab for storage

## 🔧 Advanced Configuration

### Production Setup

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Enable HTTPS
4. Set up proper logging
5. Configure backup strategies

### Customization

#### Adding New Schools

Edit `server/models/User.js`:
```javascript
school: {
  type: String,
  required: function() { return this.role === 'junior_member'; },
  enum: [
    // Add your schools here
    'Your School Name',
    'Another School'
  ]
}
```

#### Modifying Fine Rates

Update system configuration via admin panel or directly in database.

## 📚 Next Steps

After successful setup:

1. **Create Staff Users**: Use admin account to create librarians
2. **Add Books**: Import books via bulk import or individual entry
3. **Configure Notifications**: Set up email and SMS services
4. **User Training**: Train staff on system usage
5. **Go Live**: Deploy to production environment

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Check the [README.md](README.md) for more information
4. Create an issue in the repository
5. Contact the development team

## 🎯 Quick Commands Reference

```bash
# Start development servers
npm run dev

# Start only backend
cd server && npm run dev

# Start only frontend
cd client && npm run dev

# Setup system
cd server && npm run setup

# Check backend health
curl http://localhost:5000/health

# View logs
cd server && npm run dev
```

---

**🎉 Congratulations! You've successfully set up the Gatimbi Library Portal.**

The system is now ready for use. Remember to:
- Change the default admin password
- Configure your email and SMS services
- Add your library staff and books
- Train users on the system

Happy library management! 📚✨
