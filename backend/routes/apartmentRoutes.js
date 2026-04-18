const express = require('express');
const router = express.Router();
const { apartmentController } = require('../controllers');
const { auth, admin } = require('../middleware');

// NEW: Building management routes (two-step flow)
router.post('/building', auth, admin, apartmentController.createBuilding);
router.post('/:id/units', auth, admin, apartmentController.addUnit);
router.delete('/:id/units/:unitId', auth, admin, apartmentController.deleteUnit);

// Settings routes (must be before /:id to avoid conflicts)
router.get('/settings', auth, apartmentController.getSettings);
router.put('/settings', auth, admin, apartmentController.updateSettings);

// Subscription routes
router.get('/subscription', auth, apartmentController.getSubscription);
router.put('/subscription', auth, admin, apartmentController.updateSubscription);
router.get('/subscription/check/:feature', auth, apartmentController.checkFeatureAccess);

// Units management
router.put('/:id/units/assign', auth, admin, apartmentController.assignTenant);
router.put('/:id/units/unassign', auth, admin, apartmentController.unassignTenant);
router.put('/:id/units/:unitId', auth, admin, apartmentController.updateUnit);

// Tenants
router.get('/:id/tenants', apartmentController.getTenants);

// Security guards
router.post('/:id/guards', auth, admin, apartmentController.addSecurityGuard);
router.delete('/:id/guards/:guardId', auth, admin, apartmentController.removeSecurityGuard);

// Dashboard
router.get('/:id/dashboard', auth, apartmentController.getDashboardStats);

// Public routes (must be after specific routes)
router.get('/:id', apartmentController.getApartment);

// Protected routes (admin/guard)
router.get('/', auth, apartmentController.getApartments);
router.post('/', auth, admin, apartmentController.createApartment);
router.put('/:id', auth, admin, apartmentController.updateApartment);
router.delete('/:id', auth, admin, apartmentController.deleteApartment);

module.exports = router;
