const express = require('express');
const router = express.Router();
const { paymentController } = require('../controllers');
const { auth, admin } = require('../middleware');

// Public routes
router.get('/plans', paymentController.getPlans);
router.get('/status/:transactionId', paymentController.checkPaymentStatus);

// Protected routes (authenticated users)
router.post('/mpesa', auth, paymentController.initiateMpesaPayment);
router.post('/card', auth, paymentController.initiateCardPayment);
router.post('/bank', auth, paymentController.initiateBankPayment);
router.get('/user', auth, paymentController.getUserPayments);

// Admin routes - must come before /:id to avoid matching "all" as an ID
router.get('/all', auth, admin, paymentController.getAllPayments);
router.get('/', auth, admin, paymentController.getAllPayments);
router.post('/bank/confirm', auth, admin, paymentController.confirmBankPayment);

// Tenant finance routes
router.get('/tenant/finance', auth, paymentController.getTenantFinanceInfo);
router.get('/tenant/rent-dashboard', auth, paymentController.getTenantRentDashboard);
router.post('/tenant/rent-payment', auth, paymentController.makeRentPayment);
router.put('/tenant/payout', auth, paymentController.updatePayoutSettings);

// Get payments by apartment (for tenant view)
router.get('/apartment/:apartmentId', auth, paymentController.getPaymentsByApartment);

// Admin tenant finance routes
router.get('/admin/tenants-finance', auth, admin, paymentController.getAdminTenantsFinance);
router.put('/admin/tenant-rent/:tenantId', auth, admin, paymentController.updateTenantRent);

// Admin rent due date settings routes
router.put('/admin/rent-due-date/global', auth, admin, paymentController.setGlobalRentDueDate);
router.put('/admin/rent-due-date/tenant/:tenantId', auth, admin, paymentController.setTenantRentDueDate);

// Admin finance routes
router.get('/admin/analytics', auth, admin, paymentController.getAdminFinanceAnalytics);
router.get('/admin/finance-dashboard', auth, admin, paymentController.getAdminFinanceDashboard);

// Get single payment by ID
router.get('/:id', auth, paymentController.getPayment);

// M-Pesa callbacks (webhook)
router.post('/mpesa/callback', paymentController.mpesaCallback);

// Paystack webhook
router.post('/paystack/webhook', paymentController.paystackWebhook);

module.exports = router;
