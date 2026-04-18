const authController = require('./authController');
const visitorController = require('./visitorController');
const deliveryController = require('./deliveryController');
const notificationController = require('./notificationController');
const apartmentController = require('./apartmentController');
const accessLogController = require('./accessLogController');
const paymentController = require('./paymentController');
const feedbackController = require('./feedbackController');
const maintenanceController = require('./maintenanceController');
const promotionalController = require('./promotionalController');
const rentLedgerController = require('./rentLedgerController');
const emergencyController = require('./emergencyController');

module.exports = {
  authController,
  visitorController,
  deliveryController,
  notificationController,
  apartmentController,
  accessLogController,
  paymentController,
  feedbackController,
  maintenanceController,
  promotionalController,
  rentLedgerController,
  emergencyController
};
