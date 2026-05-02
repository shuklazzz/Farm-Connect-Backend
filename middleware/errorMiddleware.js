const AppError = require('../utils/AppError');

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    // If we have key/value, check if it's the email field
    if (err.keyValue && err.keyValue.email) {
        return new AppError('This email ID already exists. Please use another email or log in!', 400);
    }
    
    // Fallback for older mongo formats without keyValue but with "email_1" in message
    if ((err.errmsg && err.errmsg.includes('index: email_1')) || (err.message && err.message.includes('index: email_1'))) {
        return new AppError('This email ID already exists. Please use another email or log in!', 400);
    }

    let value = 'unknown';
    
    if (err.errmsg) {
        const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
        if (match) value = match[0];
    } else if (err.message) {
        const match = err.message.match(/(["'])(\\?.)*?\1/);
        if (match) value = match[0];
    }
    
    if (value === 'unknown' && err.keyValue) {
        value = Object.values(err.keyValue).map(v => `"${v}"`).join(', ');
    }

    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } 
    // B) Programming or other unknown error: don't leak details
    else {
        // 1) Log error
        console.error('ERROR 💥', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Mongoose bad ObjectId
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        
        // Mongoose duplicate key
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        
        // Mongoose validation error
        if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

        // JWT errors
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};
