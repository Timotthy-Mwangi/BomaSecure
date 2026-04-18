const express = require('express');
const router = express.Router();
const { deliveryController } = require('../controllers');
const { auth, guard } = require('../middleware');

// All routes require authentication
router.use(auth);

// Receive delivery (guard)
router.post('/', guard, deliveryController.receiveDelivery);

// Get deliveries
router.get('/', deliveryController.getDeliveries);

// Get pending deliveries for tenant
router.get('/pending', deliveryController.getPendingDeliveries);

// Get today's deliveries
router.get('/today', deliveryController.getTodayDeliveries);

// Get single delivery
router.get('/:id', deliveryController.getDelivery);

// Generate QR code for delivery
router.get('/:id/qrcode', deliveryController.generateQR);

// QR verification
router.post('/verify-qr', guard, deliveryController.verifyByQR);

// Confirm delivery (tenant)
router.put('/:id/confirm', deliveryController.confirmDelivery);

// Mark delivery as ready for pickup (tenant)
router.put('/:id/ready', deliveryController.markReadyForPickup);

// Return delivery (guard)
router.put('/:return', guard, deliveryController.returnDelivery);

module.exports = router;
