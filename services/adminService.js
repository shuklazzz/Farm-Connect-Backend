const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

const getAllUsers = async () => {
    return await User.find({}, '-password');
};

const deleteUser = async (userId) => {
    // Validate userId
    if (!userId || userId === 'undefined') {
        throw new Error("Invalid user ID");
    }
    
    // Cast clearly to ensure schema matches the ObjectId
    const objectId = new mongoose.Types.ObjectId(userId);

    // First, delete all products associated with this farmer
    const deleteResult = await Product.deleteMany({ farmerId: objectId });
    
    // Also delete all orders related to this farmer
    await Order.deleteMany({ farmerId: objectId });
    
    // Then delete the user
    const userResult = await User.findByIdAndDelete(userId);
    
    if (!userResult) {
        throw new Error("User not found");
    }
    
    return { 
        message: `User and ${deleteResult.deletedCount} associated products deleted.`,
        deletedProductsCount: deleteResult.deletedCount
    };
};

const getAllOrders = async () => {
    return await Order.find({})
        .populate('buyerId', 'name email location')
        .populate('farmerId', 'name email location farmDetails')
        .populate('items.productId', 'name category')
        .sort({ createdAt: -1 });
};

const getOrderById = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('buyerId', 'name email location')
        .populate('farmerId', 'name email location farmDetails')
        .populate('items.productId', 'name category');
    
    if (!order) {
        throw new Error("Order not found");
    }
    return order;
};

const getAllFarmers = async () => {
    return await User.find({ role: 'farmer' }, '-password')
        .sort({ createdAt: -1 });
};

const getFarmerSales = async (farmerId, month, year) => {
    // Build date range for the specified month
    let startDate, endDate;
    if (month && year) {
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
        // Default to current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get all orders for this farmer in the date range
    const orders = await Order.find({
        farmerId: farmerId,
        status: { $in: ['confirmed', 'shipped', 'delivered'] },
        createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate statistics
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Get farmer details
    const farmer = await User.findById(farmerId, '-password');

    return {
        farmer: farmer,
        period: {
            start: startDate,
            end: endDate,
            month: month ? parseInt(month) : new Date().getMonth() + 1,
            year: year ? parseInt(year) : new Date().getFullYear()
        },
        statistics: {
            totalSales,
            totalOrders,
            totalItems,
            averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
        },
        orders: orders
    };
};

module.exports = {
    getAllUsers,
    deleteUser,
    getAllOrders,
    getOrderById,
    getAllFarmers,
    getFarmerSales
};
