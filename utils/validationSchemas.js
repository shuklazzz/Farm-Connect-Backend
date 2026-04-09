const Joi = require('joi');

const signupSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('farmer', 'buyer').required(),
    location: Joi.object({
        address: Joi.string().optional().allow(''),
        city: Joi.string().required(),
        district: Joi.string().required(),
        state: Joi.string().required(),
        pincode: Joi.string().pattern(/^[0-9]{5,6}$/).required()
    }).required(),
    // Conditional validation for farmDetails if role is farmer
    farmDetails: Joi.when('role', {
        is: 'farmer',
        then: Joi.object({
            farmName: Joi.string().required(),
            deliveryFee: Joi.number().min(0).optional(),
            deliveryRadius: Joi.number().min(0).optional(),
            allowPickup: Joi.boolean().optional()
        }).required(),
        otherwise: Joi.forbidden()
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const productSchema = Joi.object({
    name: Joi.string().required(),
    category: Joi.string().required(),
    price: Joi.number().positive().required(),
    quantity: Joi.number().min(0).required(),
    unit: Joi.string().required(), // e.g., 'kg', 'bunch'
    description: Joi.string().optional(),
    isImperfect: Joi.boolean().optional(),
    farmerId: Joi.string().required() // usually injected by controller, but good to have schema
});

const orderSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(), // MongoDB ObjectId regex could be added
            productName: Joi.string().required(),
            quantity: Joi.number().positive().integer().required(),
            price: Joi.number().positive().required(),
            unit: Joi.string().required(),
            subtotal: Joi.number().required()
        })
    ).min(1).required(),
    totalAmount: Joi.number().positive().required(),
    deliveryFee: Joi.number().min(0).required(),
    farmerId: Joi.string().required(),
    deliveryAddress: Joi.object().required(),
    stripePaymentIntentId: Joi.string().required()
});

module.exports = {
    signupSchema,
    loginSchema,
    productSchema,
    orderSchema
};
