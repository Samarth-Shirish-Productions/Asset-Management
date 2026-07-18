const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const orgController = require('../controllers/orgController');

// ─── Branch Routes ────────────────────────────────────────────────────────────
router.get('/branches',          protect, orgController.getBranches);
router.post('/branches',         protect, adminOnly, orgController.createBranch);
router.put('/branches/:id',      protect, adminOnly, orgController.updateBranch);
router.delete('/branches/:id',   protect, adminOnly, orgController.deleteBranch);

// ─── Department Routes ────────────────────────────────────────────────────────
router.get('/departments',       protect, orgController.getDepartments);
router.post('/departments',      protect, adminOnly, orgController.createDepartment);
router.put('/departments/:id',   protect, adminOnly, orgController.updateDepartment);
router.delete('/departments/:id',protect, adminOnly, orgController.deleteDepartment);

module.exports = router;
