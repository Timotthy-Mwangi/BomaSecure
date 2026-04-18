const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Security: Require JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is required in production!');
  process.exit(1);
}

// Fallback for development only
const DEV_JWT_SECRET = process.env.JWT_SECRET || 'bomasecure-dev-secret-key-2024';
const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured for production');
  }
  return JWT_SECRET || DEV_JWT_SECRET;
};

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify with appropriate secret based on environment
    // Explicitly specify algorithm to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated.' 
      });
    }

    req.user = {
      userId: decoded.userId,
      role: user.role,
      apartmentId: user.apartmentId,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin || false
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    // Explicitly specify algorithm to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        apartmentId: user.apartmentId,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin || false
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { auth, optionalAuth };
