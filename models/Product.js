// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    category: { type: String, required: true },
    
    // --- CLOUDINARY IMAGE ---
    imageUrl: { type: String, default: null },

    // --- NEW FIELD ---
    quantity: { type: Number, required: true, default: 1 }, // e.g., 50 (kg)
    
    isImperfect: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for common queries
ProductSchema.index({ farmerId: 1 });
ProductSchema.index({ category: 1 });

module.exports = mongoose.model('Product', ProductSchema);