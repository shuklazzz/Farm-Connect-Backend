// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    buyerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    farmerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    items: [{
        productId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending' 
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    stripePaymentIntentId: {
        type: String
    },
    deliveryAddress: {
        city: String,
        pincode: String,
        address: String
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
OrderSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Indexes for common queries
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ farmerId: 1 });

module.exports = mongoose.model('Order', OrderSchema);

