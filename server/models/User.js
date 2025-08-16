import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['guest', 'junior_member', 'adult_member', 'librarian', 'chief_librarian', 'admin'],
    default: 'guest'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  // For adults
  nationalId: {
    type: String,
    required: function() { return this.role === 'adult_member'; },
    unique: true,
    sparse: true
  },
  // For juniors
  birthCertificate: {
    type: String,
    required: function() { return this.role === 'junior_member'; },
    unique: true,
    sparse: true
  },
  guardianName: {
    type: String,
    required: function() { return this.role === 'junior_member'; }
  },
  guardianPhone: {
    type: String,
    required: function() { return this.role === 'junior_member'; }
  },
  guardianEmail: {
    type: String,
    required: function() { return this.role === 'junior_member'; }
  },
  guardianId: {
    type: String,
    required: function() { return this.role === 'junior_member'; }
  },
  school: {
    type: String,
    required: function() { return this.role === 'junior_member'; },
    enum: [
      // Primary Schools
      'Meru Primary School', 'Makutano Primary School', 'Kithirune Primary School',
      'Muthara Primary School', 'Kangeta Primary School', 'Mitunguu Primary School',
      'Kiguchwa Primary School', 'Muthambi Primary School', 'Kithirune Primary School',
      'Nkubu Primary School', 'Maua Primary School', 'Miathene Primary School',
      
      // High Schools
      'Meru School', 'Makutano High School', 'Kithirune High School',
      'Muthara High School', 'Kangeta High School', 'Mitunguu High School',
      'Kiguchwa High School', 'Muthambi High School', 'Nkubu High School',
      'Maua High School', 'Miathene High School', 'St. Mary\'s High School',
      
      // Private Schools
      'Meru Academy', 'St. Joseph\'s Academy', 'Meru International School',
      'Precious Academy', 'Meru Montessori', 'Meru Christian School'
    ]
  },
  photo: {
    type: String,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role !== 'guest'; }
  },
  approvedAt: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fineBalance: {
    type: Number,
    default: 0
  },
  maxBooksAllowed: {
    type: Number,
    default: function() {
      if (this.role === 'junior_member') return 3;
      if (this.role === 'adult_member') return 5;
      return 0;
    }
  },
  currentBooksBorrowed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's readable role
userSchema.methods.getReadableRole = function() {
  const roleMap = {
    'guest': 'Guest',
    'junior_member': 'Junior Member',
    'adult_member': 'Adult Member',
    'librarian': 'Librarian',
    'chief_librarian': 'Chief Librarian',
    'admin': 'Administrator'
  };
  return roleMap[this.role] || this.role;
};

// Method to check if user can access book type
userSchema.methods.canAccessBookType = function(bookType) {
  if (this.role === 'guest' || this.role === 'librarian' || this.role === 'chief_librarian' || this.role === 'admin') {
    return true;
  }
  
  if (this.role === 'junior_member' && bookType === 'junior') {
    return true;
  }
  
  if (this.role === 'adult_member' && bookType === 'adult') {
    return true;
  }
  
  return false;
};

const User = mongoose.model('User', userSchema);

export default User;
