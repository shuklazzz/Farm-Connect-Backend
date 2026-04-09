// models/User.js
const mongoose = require('mongoose');

// This is our Master Blueprint for a user
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In a real app, we encrypt this!
    
    // ROLE: Who are they?
    role: { 
        type: String, 
        enum: ['buyer', 'farmer', 'admin'], 
        required: true 
    },

    location: {
        city: { type: String, required: true }, // e.g., "Patna"
        district: { type: String },
        state: { type: String }, // e.g., "Bihar"
        pincode: { type: String, required: true }, // e.g., "800001"
        address: String,
        // Using an untyped Object here bypasses strict CastError failures
        // if coordinates arrive undefined or malformed
        coordinates: {
            type: Object,
            default: undefined
        }
    },

    // FARMER SPECIFIC FIELDS (Optional for Consumer)
    farmDetails: {
        farmName: String,
        deliveryFee: { type: Number, default: 0 },
        deliveryRadius: { type: Number, default: 10 }, // Miles or KM
        allowPickup: { type: Boolean, default: false }
    },

    // OTP Password Reset Fields
    resetOTP: String,
    resetOTPExpires: Date,

    // Token Rotation Storage
    refreshTokens: [{ type: String }],

    createdAt: { type: Date, default: Date.now }
});

// Indexes for common queries
UserSchema.index({ role: 1 });
UserSchema.index({ "location.city": 1 });

module.exports = mongoose.model('User', UserSchema);
