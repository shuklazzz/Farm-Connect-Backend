const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            const currentUser = await User.findById(decoded.userId).select('-password');
            if (!currentUser) {
                return next(new AppError('The user belonging to this token does no longer exist.', 401));
            }

            req.user = currentUser;
            next();
        } catch (error) {
            return next(new AppError('Not authorized, token failed', 401));
        }
    } else {
        return next(new AppError('Not authorized, no token', 401));
    }
};

// Optional Auth Middleware: Doesn't block if no token, just sets req.user if found.
const optionalProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            req.user = await User.findById(decoded.userId).select('-password');
        } catch (error) {
            console.error("Optional Auth Error:", error);
            // Don't fail, just continue as guest
        }
    }
    next();
};

module.exports = { protect, optionalProtect };
