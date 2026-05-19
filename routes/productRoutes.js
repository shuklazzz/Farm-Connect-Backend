const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

const validate = require('../middleware/validationMiddleware');
const { productSchema } = require('../utils/validationSchemas');
const upload = require('../config/cloudinary');

// Put Multer upload BEFORE validation, so it can parse the multipart form into req.body and req.file first
router.post('/', protect, upload.single('image'), validate(productSchema), productController.createProduct);

// Review Routes (Nested)
const reviewRouter = require('./reviewRoutes');
router.use('/:productId/reviews', reviewRouter);

// Hybrid Logic: Optional Auth
router.get('/all', optionalProtect, productController.getAllProducts);
router.get('/:productId', productController.getProductById);
router.get('/farmer/:farmerId', productController.getFarmerProducts); // changed route to prevent conflict with /:productId
router.put('/:productId', productController.updateProduct);
router.delete('/:productId', productController.deleteProduct);

module.exports = router;
