const express = require('express');
const router = express.Router();
const promotionalController = require('../controllers/promotionalController');
const { auth } = require('../middleware');
const uploadPromo = require('../middleware/uploadPromo');

router.get('/prices', promotionalController.getPrices);
router.post('/', auth, uploadPromo.array('images', 5), promotionalController.createAd);
router.get('/active', promotionalController.getActiveAds);
router.get('/my-ads', auth, promotionalController.getMyAds);
router.get('/stats', auth, promotionalController.getStats);
router.get('/:id', promotionalController.getAdById);
router.put('/:id', auth, promotionalController.updateAd);
router.delete('/:id', auth, promotionalController.deleteAd);
router.post('/:id/impression', promotionalController.trackImpression);
router.post('/:id/click', promotionalController.trackClick);
router.post('/webhook/payment', promotionalController.paymentWebhook);

module.exports = router;
