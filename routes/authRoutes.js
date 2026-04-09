const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const validate = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { signupSchema, loginSchema } = require('../utils/validationSchemas');

router.post('/signup', validate(signupSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
