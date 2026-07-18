const express = require('express');
const multer = require('multer');
const assetController = require('../controllers/assetController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Separate multer instance for Excel imports (memory storage, no disk writes)
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) cb(null, true);
    else cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed.'));
  },
});

const router = express.Router();

const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'invoice', maxCount: 1 },
]);

// Admin CRUD & analytics
router.get('/analytics', protect, adminOnly, assetController.getDashboardAnalytics);
router.get('/my', protect, assetController.getMyAssets);

// Asset Actions (Admin Only)
router.post('/assign', protect, adminOnly, assetController.assignAsset);
router.post('/:id/maintenance', protect, adminOnly, assetController.logMaintenance);

router.post('/bulk-import', protect, adminOnly, xlsxUpload.single('file'), assetController.bulkCreateAssets);

// Standard CRUD (Admin Only)
router.post('/', protect, adminOnly, uploadFields, assetController.createAsset);
router.put('/:id', protect, adminOnly, uploadFields, assetController.updateAsset);
router.delete('/:id', protect, adminOnly, assetController.deleteAsset);

// General viewing (Admin sees all, Employee sees assigned in controller/fe logic)
router.get('/', protect, assetController.getAssets);
router.get('/my', protect, assetController.getMyAssets);

// Publicly safe QR Scan Detail (no auth needed)
router.get('/qr/:assetId', assetController.getPublicAssetDetails);

// Individual Asset Detail (admin/employee authorized details)
router.get('/:id', protect, assetController.getAssetById);

module.exports = router;
