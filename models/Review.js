const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

// Ensure one user can leave only one review per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to calculate average rating
ReviewSchema.statics.calculateAverageRating = async function (productId) {
    const obj = await this.aggregate([
        { $match: { product: productId } },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                numReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        await mongoose.model('Product').findByIdAndUpdate(productId, {
            averageRating: obj.length > 0 ? obj[0].averageRating : 0,
            numReviews: obj.length > 0 ? obj[0].numReviews : 0,
        });
    } catch (error) {
        console.error('Error calculating average rating:', error);
    }
};

// Call calculateAverageRating after saving
ReviewSchema.post('save', async function () {
    await this.constructor.calculateAverageRating(this.product);
});

// Call calculateAverageRating before removing (using findOneAndDelete)
ReviewSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await doc.constructor.calculateAverageRating(doc.product);
    }
});

module.exports = mongoose.model('Review', ReviewSchema);
