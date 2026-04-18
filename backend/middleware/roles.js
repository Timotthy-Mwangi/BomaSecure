// Role-based access control middleware

// Check if user is superadmin
const superadmin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.isSuperAdmin === true)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Superadmin privileges required.' 
    });
  }
};

// Check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

// Check if user is guard
const guard = (req, res, next) => {
  if (req.user && (req.user.role === 'guard' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Guard privileges required.' 
    });
  }
};

// Check if user is tenant
const tenant = (req, res, next) => {
  if (req.user && (req.user.role === 'tenant' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Tenant privileges required.' 
    });
  }
};

// Check if user is admin or guard
const adminOrGuard = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'guard')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin or Guard privileges required.' 
    });
  }
};

// Check if user is admin, guard, or tenant
const anyRole = (req, res, next) => {
  if (req.user && ['admin', 'guard', 'tenant', 'superadmin'].includes(req.user.role)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Valid role required.' 
    });
  }
};

// Check specific roles
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. One of these roles required: ${roles.join(', ')}` 
      });
    }
  };
};

module.exports = {
  superadmin,
  admin,
  guard,
  tenant,
  adminOrGuard,
  anyRole,
  hasRole
};
