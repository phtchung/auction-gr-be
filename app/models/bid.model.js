const mongoose = require('mongoose')

const Bid = mongoose.model(
    'Bid',
    new mongoose.Schema(
        {
            auction_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Auction',
                index: true
            },
            username: String,
            bid_price: Number,
            bid_time: Date
        },
        {timestamps: true}
    )
)

module.exports = Bid
