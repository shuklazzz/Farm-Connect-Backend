const AppError = require('../utils/AppError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const { geocodePincode } = require('../utils/geocoder');

const registerUser = async (userData) => {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = new User({...userData, password: hashedPassword });
    
    // Attempt Geocoding silently
    if (newUser.location && newUser.location.pincode) {
         const coords = await geocodePincode(newUser.location.pincode);
         if (coords) {
             newUser.location.coordinates = coords;
         }
    }

    await newUser.save();
    return newUser;
};

const loginUser = async (email, password) => {
    const user = await User.findOne({ email: email });
    
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
         throw new AppError("Invalid email or password", 401);
    }

    if (!process.env.JWT_SECRET) {
        throw new AppError("JWT_SECRET is not defined in server environment", 500);
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    return {
        token,
        refreshToken,
        user: { 
            id: user._id, 
            name: user.name, 
            role: user.role,
            location: user.location,
            farmDetails: user.farmDetails
        }
    };
};

const refreshUserToken = async (oldRefreshToken) => {
    if (!oldRefreshToken) throw new AppError("No refresh token provided", 401);
    
    try {
        const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.refreshTokens.includes(oldRefreshToken)) {
            throw new AppError("Invalid or revoked refresh token", 401);
        }
        
        const newAccessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Remove old token and save new token (Token Rotation)
        user.refreshTokens = user.refreshTokens.filter(t => t !== oldRefreshToken);
        user.refreshTokens.push(newRefreshToken);
        await user.save();
        
        return { token: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
        throw new AppError("Invalid or expired refresh token", 401);
    }
};

const logoutUser = async (userId, refreshToken) => {
    if (!userId || !refreshToken) return;
    const user = await User.findById(userId);
    if (user && user.refreshTokens) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
        await user.save();
    }
};
const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User with this email does not exist", 404);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.resetOTP = hashedOTP;
    user.resetOTPExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const message = `Your password reset code is: ${otp}\nThis code will expire in 15 minutes.`;
    await sendEmail({
        to: email,
        subject: "Farm-Connect Password Reset Code",
        text: message
    });
};

const verifyOTP = async (email, otp) => {
    const user = await User.findOne({ email });
    if (!user || !user.resetOTP || user.resetOTPExpires < Date.now()) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) throw new AppError("Invalid or expired OTP", 400);
    return true;
};

const resetPassword = async (email, otp, newPassword) => {
    const user = await User.findOne({ email });
    if (!user || !user.resetOTP || user.resetOTPExpires < Date.now()) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) throw new AppError("Invalid or expired OTP", 400);

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new AppError("New password cannot be the same as the old password", 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();
};

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    verifyOTP,
    resetPassword,
    refreshUserToken,
    logoutUser
};
