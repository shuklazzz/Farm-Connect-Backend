const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');

// @desc    Create new review
// @route   POST /api/products/:productId/reviews
// @access  Private
const createReview = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;

        const product = await Product.findById(productId);
        if (!product) {
            return next(new AppError('Product not found', 404));
        }

        // VERIFIED BUYER CHECK
        // Check if the user has an order containing this product with status 'delivered'
        const hasBought = await Order.findOne({
            buyerId: req.user._id,
            status: 'delivered',
            'items.productId': productId
        });

        if (!hasBought) {
            return next(new AppError('You must purchase and receive this product before you can review it.', 403));
        }

        // Check if already reviewed
        const alreadyReviewed = await Review.findOne({
            product: productId,
            user: req.user._id
        });

        if (alreadyReviewed) {
            return next(new AppError('You have already reviewed this product', 400));
        }

        const review = await Review.create({
            rating: Number(rating),
            comment,
            product: productId,
            user: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: review
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public (conditionally restricted)
const getProductReviews = async (req, res, next) => {
    try {
        let hasPurchased = false;

        // If user is logged in, check if they bought the product
        if (req.user) {
            const hasBought = await Order.findOne({
                buyerId: req.user._id,
                status: 'delivered',
                'items.productId': req.params.productId
            });
            if (hasBought) {
                hasPurchased = true;
            }
        }

        // If not purchased, don't send the review data back for privacy
        if (!hasPurchased) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                hasPurchased: false,
                message: "Reviews are hidden. Purchase this product to view reviews."
            });
        }

        const reviews = await Review.find({ product: req.params.productId })
            .populate('user', 'name')
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews,
            hasPurchased: true
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    getProductReviews
};
