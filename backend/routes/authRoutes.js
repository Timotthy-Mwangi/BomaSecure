const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { auth } = require('../middleware');
const { superadmin } = require('../middleware/roles');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/invite', auth, authController.generateInvite);
router.post('/register-invite', authController.registerViaInvite);

// Superadmin login (with extra security)
router.post('/superadmin/login', authController.superAdminLogin);

// Protected routes
router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);
router.put('/password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);
router.delete('/account', auth, authController.deleteMyAccount);

// Admin routes
router.get('/users', auth, authController.getAllUsers);
router.get('/stats', auth, authController.getStats);
router.put('/users/:userId', auth, authController.updateUser);
router.delete('/users/:userId', auth, authController.deleteUser);
router.put('/users/:userId/verify', auth, authController.verifyUser);
router.post('/users/:userId/rate', auth, authController.rateUser);

// ==================== SUPERADMIN ROUTES ====================
// These routes are restricted to superadmin role only

// System-wide statistics
router.get('/superadmin/stats', auth, superadmin, authController.getSuperAdminStats);

// Get all users system-wide
router.get('/superadmin/users', auth, superadmin, authController.getAllUsersSystemWide);

// Update any user system-wide
router.put('/superadmin/users/:userId', auth, superadmin, authController.updateUserSystemWide);

// Suspend any user
router.post('/superadmin/users/:userId/suspend', auth, superadmin, authController.suspendUser);

// Unsuspend any user
router.post('/superadmin/users/:userId/unsuspend', auth, superadmin, authController.unsuspendUser);

// Discontinue (delete) any user
router.delete('/superadmin/users/:userId', auth, superadmin, authController.discontinueUser);

// Bulk suspend users
router.post('/superadmin/users/bulk-suspend', auth, superadmin, authController.bulkSuspendUsers);

// View audit logs
router.get('/superadmin/audit-logs', auth, superadmin, authController.getSystemAuditLogs);

// Configure superadmin security settings
router.put('/superadmin/security', auth, superadmin, authController.configureSuperAdminSecurity);

// Get all buildings system-wide
router.get('/superadmin/buildings', auth, superadmin, authController.getAllBuildingsSystemWide);

// Get security alerts
router.get('/superadmin/security/alerts', auth, superadmin, authController.getSecurityAlerts);

// Get system servers
router.get('/superadmin/servers', auth, superadmin, authController.getSystemServers);

// Get system stats (alternative endpoint)
router.get('/superadmin/system-stats', auth, superadmin, authController.getSystemStats);

// Get/Update system settings (including maintenance mode)
router.get('/superadmin/settings', auth, superadmin, authController.getSystemSettings);
router.put('/superadmin/settings', auth, superadmin, authController.updateSystemSettings);

module.exports = router;
