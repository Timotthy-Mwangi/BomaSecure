// Input validation middleware

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors 
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  register: {
    type: 'object',
    required: ['name', 'phone', 'email', 'password'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      phone: { type: 'string', pattern: '^\\+?254\\d{9}$' },
      email: { type: 'string', format: 'email', maxLength: 255 },
      // Strong password: min 8 chars
      password: { type: 'string', minLength: 8, maxLength: 128 },
      role: { type: 'string', enum: ['tenant', 'guard', 'admin'] },
      roomNumber: { type: 'string', maxLength: 20 },
      idNumber: { type: 'string', maxLength: 20 },
      apartmentId: { type: 'string' }
    }
  },
  
  login: {
    type: 'object',
    required: ['phone', 'password'],
    properties: {
      phone: { type: 'string' },
      password: { type: 'string' }
    }
  },
  
  createVisitor: {
    type: 'object',
    required: ['name', 'phone', 'hostTenantId'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      phone: { type: 'string', maxLength: 20 },
      idNumber: { type: 'string', maxLength: 20 },
      vehiclePlate: { type: 'string', maxLength: 20 },
      purpose: { type: 'string', enum: ['guest', 'delivery', 'maintenance', 'official', 'other'] },
      hostTenantId: { type: 'string' },
      roomNumber: { type: 'string', maxLength: 20 },
      expectedArrival: { type: 'string', format: 'date-time' },
      notes: { type: 'string', maxLength: 500 }
    }
  },
  
  receiveDelivery: {
    type: 'object',
    required: ['courierName', 'courierPhone', 'parcelDescription', 'recipientTenantId'],
    properties: {
      courierName: { type: 'string', maxLength: 100 },
      courierPhone: { type: 'string', maxLength: 20 },
      courierCompany: { type: 'string', maxLength: 100 },
      parcelDescription: { type: 'string', maxLength: 500 },
      parcelWeight: { type: 'number' },
      trackingNumber: { type: 'string', maxLength: 100 },
      recipientTenantId: { type: 'string' },
      roomNumber: { type: 'string', maxLength: 20 },
      notes: { type: 'string', maxLength: 500 }
    }
  },
  
  createApartment: {
    type: 'object',
    required: ['buildingName', 'buildingCode'],
    properties: {
      buildingName: { type: 'string', minLength: 2, maxLength: 100 },
      buildingCode: { type: 'string', maxLength: 20 },
      location: {
        type: 'object',
        properties: {
          address: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 100 },
          county: { type: 'string', maxLength: 100 },
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        }
      },
      units: { type: 'array' },
      gates: { type: 'array' }
    }
  }
};

// Simple validation without Joi (fallback)
const simpleValidate = (fields) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const field of fields) {
      const value = req.body[field.field];
      
      if (field.required && !value) {
        errors.push({ field: field.field, message: `${field.field} is required` });
        continue;
      }
      
      if (value && field.type && typeof value !== field.type) {
        errors.push({ field: field.field, message: `${field.field} must be of type ${field.type}` });
      }
      
      if (value && field.minLength && value.length < field.minLength) {
        errors.push({ field: field.field, message: `${field.field} must be at least ${field.minLength} characters` });
      }
      
      if (value && field.maxLength && value.length > field.maxLength) {
        errors.push({ field: field.field, message: `${field.field} must not exceed ${field.maxLength} characters` });
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors 
      });
    }
    
    next();
  };
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
};

module.exports = { validate, schemas, simpleValidate, validatePasswordStrength };
