const express = require('express');
const router = express.Router();
const { accessLogController } = require('../controllers');
const { auth, admin, guard } = require('../middleware');

// All routes require authentication
router.use(auth);

// Get access logs
router.get('/', accessLogController.getAccessLogs);

// Get realtime events
router.get('/realtime', accessLogController.getRealtimeEvents);

// Get access stats
router.get('/stats', accessLogController.getAccessStats);

// Get single log
router.get('/:id', accessLogController.getAccessLog);

// Create access log (guard or system)
router.post('/', guard, accessLogController.createAccessLog);

// Delete access log (admin only)
router.delete('/:id', admin, accessLogController.deleteAccessLog);

module.exports = router;
