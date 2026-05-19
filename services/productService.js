const Product = require('../models/Product');

const createProduct = async (productData) => {
    const newProduct = new Product(productData);
    await newProduct.save();
    return newProduct;
};

const getAllProducts = async (city) => {
    // GLOBAL MARKETPLACE:
    // Return all products globally so buyers can see everything,
    // regardless of their city. Delivery fees handle logic if out of bounds.
    return await Product.find({}).populate('farmerId');
};

const getProductById = async (productId) => {
    return await Product.findById(productId).populate('farmerId');
};

const getProductsByFarmer = async (farmerId) => {
    return await Product.find({ farmerId: farmerId });
};

const updateProduct = async (productId, updateData) => {
    const { name, price, quantity, unit, category, isImperfect } = updateData;
    return await Product.findByIdAndUpdate(
        productId,
        { name, price, quantity, unit, category, isImperfect },
        { new: true }
    );
};

const deleteProduct = async (productId) => {
    return await Product.findByIdAndDelete(productId);
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    getProductsByFarmer,
    updateProduct,
    deleteProduct
};
