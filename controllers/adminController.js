const adminService = require('../services/adminService');
const AppError = require('../utils/AppError');

// E.1 Get ALL Users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await adminService.getAllUsers();
        res.json(users);
    } catch (error) {
        next(new AppError("Failed to fetch users", 500));
    }
};

// E.2 Delete User
const deleteUser = async (req, res, next) => {
    try {
        const result = await adminService.deleteUser(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        if (error.message === "Invalid user ID") {
            return next(new AppError(error.message, 400));
        }
        if (error.message === "User not found") {
            return next(new AppError(error.message, 404));
        }
        next(error);
    }
};

// E.3 Get All Orders (Admin)
const getAllOrders = async (req, res, next) => {
    try {
        const orders = await adminService.getAllOrders();
        res.json(orders);
    } catch (error) {
        next(new AppError("Failed to fetch orders", 500));
    }
};

// E.4 Get Order Details (Admin)
const getOrderDetails = async (req, res, next) => {
    try {
        const order = await adminService.getOrderById(req.params.id);
        res.json(order);
    } catch (error) {
        if (error.message === "Order not found") {
             return next(new AppError("Order not found", 404));
        }
        next(new AppError("Failed to fetch order", 500));
    }
};

// E.5 Get All Farmers with Profiles (Admin)
const getAllFarmers = async (req, res, next) => {
    try {
        const farmers = await adminService.getAllFarmers();
        res.json(farmers);
    } catch (error) {
        next(new AppError("Failed to fetch farmers", 500));
    }
};

// E.6 Get Farmer Sales Statistics (Admin)
const getFarmerSalesStatistics = async (req, res, next) => {
    try {
        const { farmerId } = req.params;
        const { month, year } = req.query; // e.g., month=11, year=2024
        
        const stats = await adminService.getFarmerSales(farmerId, month, year);
        res.json(stats);
    } catch (error) {
        next(new AppError("Failed to fetch sales statistics", 500));
    }
};

module.exports = {
    getAllUsers,
    deleteUser,
    getAllOrders,
    getOrderDetails,
    getAllFarmers,
    getFarmerSalesStatistics
};
