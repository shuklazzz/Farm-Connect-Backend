const marketService = require('../services/marketService');
const AppError = require('../utils/AppError');

const getMarketPrice = async (req, res, next) => {
    try {
        const userInput = req.query.item; 
        const userCity = req.user ? req.user.location.city : '';
        
        if (!userInput) return next(new AppError("No item name provided", 400));

        const result = await marketService.getMarketPrice(userInput, userCity);

        if (result.found) {
            res.json(result.data);
        } else {
            next(new AppError("Unknown item", 404));
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMarketPrice
};
