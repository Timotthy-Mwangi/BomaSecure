const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { auth } = require('../middleware');
const { ROLES } = require('../middleware/roles');
const uploadEmergency = require('../middleware/uploadEmergency');

// Get all emergencies (admin only)
router.get('/', auth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}, emergencyController.getAllEmergencies);

// Get emergency stats (admin only)
router.get('/stats', auth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}, emergencyController.getEmergencyStats);

// Get emergencies by apartment
router.get('/apartment/:apartmentId', auth, emergencyController.getEmergenciesByApartment);

// Get single emergency
router.get('/:id', auth, emergencyController.getEmergency);

// Report new emergency (all authenticated users) - with optional photo uploads
router.post('/', auth, uploadEmergency.array('photos', 5), emergencyController.reportEmergency);

// Update emergency status
router.put('/:id', auth, emergencyController.updateEmergency);

// Resolve emergency
router.put('/:id/resolve', auth, emergencyController.resolveEmergency);

module.exports = router;
