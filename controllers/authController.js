const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const { geocodePincode } = require('../utils/geocoder');

const register = async (req, res, next) => {
    try {
        const newUser = await authService.registerUser(req.body);
        res.status(201).json({
            message: "User created successfully!",
            userId: newUser._id
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }

        const result = await authService.loginUser(email, password);

        res.status(200).json({ 
            message: "Login successful", 
            token: result.token, 
            refreshToken: result.refreshToken,
            user: result.user 
        });

    } catch (error) {
        next(error);
    }
};
const forgotPassword = async (req, res, next) => {
    try {
        if (!req.body.email) return next(new AppError("Email is required", 400));
        await authService.forgotPassword(req.body.email);
        res.status(200).json({ message: "OTP sent to email" });
    } catch (error) { next(error); }
};

const verifyOTP = async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.otp) return next(new AppError("Email and OTP are required", 400));
        await authService.verifyOTP(req.body.email, req.body.otp);
        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) { next(error); }
};

const resetPassword = async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.otp || !req.body.newPassword) return next(new AppError("Email, OTP, and new password are required", 400));
        await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) { next(error); }
};

const getProfile = async (req, res, next) => {
    try {
        res.status(200).json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                location: req.user.location,
                farmDetails: req.user.farmDetails
            }
        });
    } catch (error) { next(error); }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, email, location, farmDetails } = req.body;
        const user = req.user;
        
        if (name) user.name = name;
        if (email) user.email = email;
        if (location) {
             // If pincode changed or coordinates are missing, recalculate 
             const currentPincode = user.location?.pincode;
             const newPincode = location.pincode || currentPincode;
             const hasCoordinates = user.location?.coordinates?.lat;

             if (newPincode && (newPincode !== currentPincode || !hasCoordinates)) {
                 const coords = await geocodePincode(newPincode);
                 if (coords) {
                     location.coordinates = coords;
                 }
             }

             // Safely update Mongoose subdocument
             if (!user.location) user.location = {};
             
             // Iteratively assign to avoid spreading Mongoose internal properties
             Object.keys(location).forEach(key => {
                  user.location[key] = location[key];
             });
        }
        if (farmDetails && user.role === 'farmer') {
            user.farmDetails = {
                farmName: farmDetails.farmName !== undefined ? farmDetails.farmName : user.farmDetails?.farmName,
                deliveryFee: farmDetails.deliveryFee !== undefined && farmDetails.deliveryFee !== '' ? Number(farmDetails.deliveryFee) : user.farmDetails?.deliveryFee,
                deliveryRadius: farmDetails.deliveryRadius !== undefined && farmDetails.deliveryRadius !== '' ? Number(farmDetails.deliveryRadius) : user.farmDetails?.deliveryRadius,
                allowPickup: farmDetails.allowPickup !== undefined ? farmDetails.allowPickup : user.farmDetails?.allowPickup
            };
        }
        
        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                farmDetails: user.farmDetails
            }
        });
    } catch (error) { next(error); }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshUserToken(refreshToken);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { userId, refreshToken } = req.body;
        await authService.logoutUser(userId, refreshToken);
        res.status(200).json({ message: "Logged out thoroughly" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    verifyOTP,
    resetPassword,
    getProfile,
    updateProfile,
    refresh,
    logout
};

