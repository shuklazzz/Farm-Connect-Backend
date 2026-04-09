const productService = require('../services/productService');

const createProduct = async (req, res) => {
    try {
        const productData = { ...req.body };
        if (req.file) {
            productData.imageUrl = req.file.path; // Multer-Cloudinary automatically assigns the secure download link here
        }
        
        const newProduct = await productService.createProduct(productData);
        res.status(201).json({ message: "Product listed!", product: newProduct });
    } catch (error) {
        res.status(500).json({ message: "Error adding product", error: error.message });
    }
};

const getAllProducts = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        
        let city = null;
        if (req.user && req.user.location) {
            city = req.user.location.city;
        }
        
        const products = await productService.getAllProducts(city);
        
        // Return structured response to help frontend debugging
        // If city is null, we are in Guest Mode
        res.json({
            products,
            isGuest: !city,
            userCity: city
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
};

const getFarmerProducts = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        const products = await productService.getProductsByFarmer(req.params.farmerId);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Error fetching products" });
    }
};

const updateProduct = async (req, res) => {
    try {
        const updatedProduct = await productService.updateProduct(req.params.productId, req.body);
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product updated successfully!", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "Error updating product", error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await productService.deleteProduct(req.params.productId);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting product", error: error.message });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getFarmerProducts,
    updateProduct,
    deleteProduct
};
