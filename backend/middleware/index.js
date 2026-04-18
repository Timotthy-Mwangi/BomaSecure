const { auth, optionalAuth } = require('./auth');
const { admin, guard, tenant, adminOrGuard, anyRole, hasRole } = require('./roles');
const { validate, schemas, simpleValidate, validatePasswordStrength } = require('./validation');
const securityMiddleware = require('./security');

module.exports = {
  auth,
  optionalAuth,
  admin,
  guard,
  tenant,
  adminOrGuard,
  anyRole,
  hasRole,
  validate,
  schemas,
  simpleValidate,
  validatePasswordStrength,
  // Security middleware
  security: securityMiddleware
};
