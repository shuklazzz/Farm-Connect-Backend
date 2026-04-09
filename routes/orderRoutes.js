const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

const validate = require('../middleware/validationMiddleware');
const { orderSchema } = require('../utils/validationSchemas');

// POST /api/orders/create-checkout-session
router.post('/create-checkout-session', orderController.createCheckoutSession);

// POST /api/orders - Create a new order (Buyer)
router.post('/', validate(orderSchema), orderController.createOrder);

// GET /api/orders/buyer - Get my orders (Buyer)
router.get('/buyer', orderController.getBuyerOrders);

// GET /api/orders/farmer - Get incoming orders (Farmer)
router.get('/farmer', orderController.getFarmerOrders);

// GET /api/orders/farmer/analytics - Get sales stats
router.get('/farmer/analytics', orderController.getFarmerAnalytics);

// PUT /api/orders/:orderId/status - Update status (Farmer)
router.put('/:orderId/status', orderController.updateOrderStatus);

module.exports = router;
