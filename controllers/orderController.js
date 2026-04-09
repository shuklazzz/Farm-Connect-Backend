const Order = require('../models/Order');
const Product = require('../models/Product');

// Create a new order
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_fake_key_for_now');
const { getIo } = require('../sockets/notificationSocket');

exports.createCheckoutSession = async (req, res) => {
    try {
        const { totalAmount } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'inr',
            description: `Farm-Connect Master Checkout: ${req.user._id}`,
            metadata: { buyerId: req.user._id.toString() }
        });
        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error) {
        console.error("CRITICAL STRIPE ERROR:", error);
        res.status(500).json({ message: "Failed to create checkout session", error: error.message });
    }
};

// Create a new order
exports.createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, totalAmount, deliveryFee, farmerId, deliveryAddress, stripePaymentIntentId } = req.body;
        
        // 1. Validate Items & Check Stock (Atomic Check & Update)
        for (const item of items) {
            // Find product and atomically decrement stock ONLY if sufficient quantity exists.
            // This prevents race conditions.
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, quantity: { $gte: item.quantity } },
                { $inc: { quantity: -item.quantity } },
                { session, new: true }
            );

            if (!updatedProduct) {
                // If null, it means product doesn't exist OR insufficient stock
                // We need to check which one it is to give a good error message
                const productExists = await Product.findById(item.productId).session(session);
                if (!productExists) {
                    throw new AppError(`Product not found: ${item.productName}`, 404);
                } else {
                    throw new AppError(`Out of Stock: ${productExists.name}. Available: ${productExists.quantity}`, 400);
                }
            }
        }

        const newOrder = new Order({
            buyerId: req.user._id,
            farmerId,
            items,
            totalAmount,
            deliveryFee,
            deliveryAddress,
            status: 'confirmed',
            paymentStatus: 'paid',
            stripePaymentIntentId: stripePaymentIntentId
        });

        const savedOrder = await newOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        // 3. Emit Live Socket Notification to the specific Farmer
        try {
            const io = getIo();
            io.to(`farmer_${farmerId}`).emit('new_order', {
                message: '🚜 You received a new order!',
                orderId: savedOrder._id,
                totalAmount: savedOrder.totalAmount
            });
        } catch (socketErr) {
            console.error("Socket emit failed (non-fatal):", socketErr);
        }

        res.status(201).json({ order: savedOrder });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error); // Pass to global error handler
    }
};

// Get Orders for a Buyer (My Orders)
exports.getBuyerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyerId: req.user._id })
            .populate('farmerId', 'name email location') // Show farmer details
            .sort({ createdAt: -1 }); // Latest first
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// Get Orders for a Farmer (Incoming Orders)
exports.getFarmerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ farmerId: req.user._id })
            .populate('buyerId', 'name email location') // Show buyer details
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// Update Order Status (Accept/Reject/Ship)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { orderId } = req.params;

        // Verify that the logged-in user is the farmer for this order
        const order = await Order.findOne({ _id: orderId, farmerId: req.user._id });
        if (!order) {
            return res.status(404).json({ message: "Order not found or unauthorized" });
        }

        order.status = status;
        await order.save();

        res.json({ message: `Order updated to ${status}`, order });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};
// Get Analytics for Farmer Dashboard
exports.getFarmerAnalytics = async (req, res) => {
    try {
        const farmerId = req.user._id;
        
        // 1. Total Revenue & Total Orders
        const orders = await Order.find({ 
            farmerId, 
            status: { $ne: 'cancelled' } 
        });

        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = orders.length;

        // Calculate Weekly Revenue (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyRevenue = orders
            .filter(o => new Date(o.createdAt) >= sevenDaysAgo)
            .reduce((sum, o) => sum + o.totalAmount, 0);

        // 2. Sales Over Time (Last 7 days)
        const salesData = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            salesData[date] = (salesData[date] || 0) + order.totalAmount;
        });
        
        const chartData = Object.keys(salesData).map(date => ({
            name: date,
            sales: salesData[date]
        }));

        // 3. Top Selling Products with Unit
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productName]) {
                    productSales[item.productName] = { quantity: 0, unit: item.unit };
                }
                productSales[item.productName].quantity += item.quantity;
            });
        });

        const topProducts = Object.keys(productSales)
            .map(name => ({ 
                name, 
                value: productSales[name].quantity, 
                unit: productSales[name].unit 
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        res.json({
            totalRevenue,
            weeklyRevenue,
            totalOrders,
            chartData,
            topProducts
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
    }
};
