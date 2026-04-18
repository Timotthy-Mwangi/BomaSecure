const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { auth } = require('../middleware');
const { hasRole } = require('../middleware/roles');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Tenant routes
router.get('/my-requests', auth, hasRole('tenant'), maintenanceController.getMyRequests);
router.post('/', auth, hasRole('tenant'), upload.fields([{ name: 'photos', maxCount: 5 }]), maintenanceController.createRequest);

// Maintenance staff directory - accessible by tenant, guard, admin
router.get('/staff', auth, hasRole('tenant', 'guard', 'admin', 'maintenance'), maintenanceController.getStaff);

// Admin/Guard/Maintenance routes - also accessible by tenant for viewing their own requests
router.get('/', auth, hasRole('admin', 'guard', 'tenant', 'maintenance'), maintenanceController.getAllRequests);
router.get('/:id', auth, hasRole('admin', 'guard', 'tenant', 'maintenance'), maintenanceController.getOneRequest);
router.put('/:id', auth, hasRole('admin', 'guard', 'maintenance'), maintenanceController.updateRequest);
router.patch('/:id/status', auth, hasRole('admin', 'guard', 'maintenance'), maintenanceController.updateStatus);
router.delete('/:id', auth, hasRole('admin'), maintenanceController.deleteRequest);

// Contact maintenance staff
router.post('/:id/contact', auth, hasRole('tenant', 'guard', 'admin', 'maintenance'), maintenanceController.contactStaff);
router.post('/:id/image', auth, hasRole('tenant', 'guard', 'admin', 'maintenance'), upload.single('image'), maintenanceController.sendImageToStaff);

module.exports = router;