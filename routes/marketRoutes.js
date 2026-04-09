const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

const { protect } = require('../middleware/authMiddleware');

// Smart Market Price API (Fuzzy Match!)
router.get('/market-price', marketController.getMarketPrice);

module.exports = router;
