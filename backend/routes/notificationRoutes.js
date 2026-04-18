const express = require('express');
const router = express.Router();
const { notificationController } = require('../controllers');
const { auth, admin } = require('../middleware');

// All routes require authentication
router.use(auth);

// Broadcast announcement (admin only)
router.post('/broadcast', admin, notificationController.broadcastAnnouncement);

// Create notification
router.post('/', notificationController.createNotification);

// Get notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
