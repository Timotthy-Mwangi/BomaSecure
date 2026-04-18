const express = require('express');

const router = express.Router();

const { auth } = require('../middleware/auth');
const { admin, hasRole } = require('../middleware');

const feedbackController = require('../controllers/feedbackController');

router.post('/', auth, hasRole('tenant', 'guard', 'admin'), feedbackController.submitFeedback);

router.get('/', auth, feedbackController.getAllFeedback);

router.get('/:id', auth, feedbackController.getFeedback);

router.put('/:id', auth, admin, feedbackController.updateFeedback);

router.delete('/:id', auth, admin, feedbackController.deleteFeedback);

module.exports = router;