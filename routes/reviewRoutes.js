const express = require('express');
const router = express.Router({ mergeParams: true }); // Important for getting productId from parent route
const { createReview, getProductReviews } = require('../controllers/reviewController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.route('/')
    .get(optionalProtect, getProductReviews)
    .post(protect, createReview);

module.exports = router;
