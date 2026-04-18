const express = require('express');
const router = express.Router();
const { visitorController } = require('../controllers');
const { auth, guard } = require('../middleware');

// All routes require authentication
router.use(auth);

// Public for pre-approval (tenant creates visitor)
router.post('/', visitorController.createVisitor);

// Bulk create visitors (tenant pre-approves multiple at once)
router.post('/bulk', visitorController.createBulkVisitors);

// Get visitors with filters
router.get('/', visitorController.getVisitors);

// Get pending requests for tenant
router.get('/pending', visitorController.getPendingRequests);

// Get today's visitors
router.get('/today', visitorController.getTodayVisitors);

// QR verification
router.post('/verify-qr', guard, visitorController.verifyByQR);

// Get single visitor
router.get('/:id', visitorController.getVisitor);

// Generate QR code for visitor
router.get('/:id/qrcode', visitorController.generateQR);

// Approve visitor
router.put('/:id/approve', visitorController.approveVisitor);

// Deny visitor
router.put('/:id/deny', visitorController.denyVisitor);

// Check in visitor (guard)
router.put('/:id/checkin', guard, visitorController.checkInVisitor);

// Check out visitor (guard)
router.put('/:id/checkout', guard, visitorController.checkOutVisitor);

module.exports = router;
