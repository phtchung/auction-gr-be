const mongoose = require('mongoose')

const Auction = mongoose.model(
    'Auction',
    new mongoose.Schema({
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        bid_price: Number,
        bid_time:Date,
    },{timestamps: true})
)

module.exports = Auction
