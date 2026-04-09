const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.get('/farmers', adminController.getAllFarmers);
router.get('/farmers/:farmerId/sales', adminController.getFarmerSalesStatistics);

module.exports = router;
