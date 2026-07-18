const express = require('express');
const requestController = require('../controllers/requestController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, requestController.createRequest);
router.get('/', protect, requestController.getRequests);
router.put('/:requestId', protect, adminOnly, requestController.handleRequest);

module.exports = router;
