const express = require('express');
const router = express.Router();
const { rentLedgerController } = require('../controllers');
const { auth, admin } = require('../middleware');

router.post('/', auth, rentLedgerController.createRentRecord);
router.post('/bulk', auth, admin, rentLedgerController.bulkCreateRecords);
router.post('/reminders/trigger', auth, admin, rentLedgerController.triggerReminders);
router.get('/tenant/:tenantId', auth, rentLedgerController.getTenantRentLedger);
router.get('/all', auth, admin, rentLedgerController.getAllRentLedger);
router.get('/summary', auth, admin, rentLedgerController.getLedgerSummary);
router.get('/report', auth, admin, rentLedgerController.generateReport);
router.put('/late-fees', auth, admin, rentLedgerController.applyLateFees);
router.put('/:id', auth, admin, rentLedgerController.updateRentRecord);
router.delete('/:id', auth, admin, rentLedgerController.deleteRentRecord);

module.exports = router;