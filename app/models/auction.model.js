const mongoose = require('mongoose')

const Auction = mongoose.model(
    'Auction',
    new mongoose.Schema(
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                index: true
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            username: String,
            bid_price: Number,
            bid_time: Date
        },
        {timestamps: true}
    )
)

module.exports = Auction
