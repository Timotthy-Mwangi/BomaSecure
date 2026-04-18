const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth, admin } = require('../middleware');

router.get('/', settingsController.getSettings);
router.put('/', auth, settingsController.updateSetting);
router.get('/bank-accounts', settingsController.getBankAccounts);
router.get('/bank-accounts/default', settingsController.getDefaultBankAccount);
router.post('/bank-accounts', auth, admin, settingsController.addBankAccount);
router.put('/bank-accounts/:id', auth, admin, settingsController.updateBankAccount);
router.delete('/bank-accounts/:id', auth, admin, settingsController.deleteBankAccount);

module.exports = router;