import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'fines', 'notifications', 'borrowing', 'system', 'sms', 'email'
    ],
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  requiresRestart: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Static method to get configuration value
systemConfigSchema.statics.getValue = async function(key, defaultValue = null) {
  try {
    const config = await this.findOne({ key });
    return config ? config.value : defaultValue;
  } catch (error) {
    console.error(`Error getting config value for ${key}:`, error);
    return defaultValue;
  }
};

// Static method to set configuration value
systemConfigSchema.statics.setValue = async function(key, value, description, updatedBy) {
  try {
    const config = await this.findOne({ key });
    
    if (config) {
      config.value = value;
      config.description = description || config.description;
      config.updatedBy = updatedBy;
      config.version += 1;
      return await config.save();
    } else {
      // Determine data type
      let dataType = 'string';
      if (typeof value === 'number') dataType = 'number';
      else if (typeof value === 'boolean') dataType = 'boolean';
      else if (Array.isArray(value)) dataType = 'array';
      else if (typeof value === 'object') dataType = 'object';
      
      return await this.create({
        key,
        value,
        description,
        dataType,
        updatedBy
      });
    }
  } catch (error) {
    console.error(`Error setting config value for ${key}:`, error);
    throw error;
  }
};

// Static method to get all configs by category
systemConfigSchema.statics.getByCategory = async function(category) {
  try {
    return await this.find({ category }).sort({ key: 1 });
  } catch (error) {
    console.error(`Error getting configs for category ${category}:`, error);
    return [];
  }
};

// Method to validate value based on data type
systemConfigSchema.methods.validateValue = function(value) {
  switch (this.dataType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) && value !== null;
    default:
      return true;
  }
};

// Pre-save validation
systemConfigSchema.pre('save', function(next) {
  if (!this.validateValue(this.value)) {
    return next(new Error(`Invalid value type for ${this.key}. Expected ${this.dataType}`));
  }
  next();
});

// Indexes
systemConfigSchema.index({ key: 1 });
systemConfigSchema.index({ category: 1 });
systemConfigSchema.index({ isEditable: 1 });

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

export default SystemConfig;
