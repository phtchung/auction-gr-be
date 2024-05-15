const mongoose = require('mongoose')

const Request = mongoose.model(
    'Request',
    new mongoose.Schema(
        {
            seller_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            category_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            request_name: String,
            status: {
                type: Number,
                enum: [1, 2, 13],
                default: 1
            },
            sale_price: Number,
            reserve_price: Number,
            step_price: Number,
            shipping_fee: Number,
            auction_live: {
                type: Number,
                enum: [0, 1],
            },
            reason: String,
            reject_time: Date,
            approved_time: Date,
            start_time: Date,
            finish_time: Date,
            type_of_auction: Number,
            admin_belong : Number
        },
        {timestamps: true}
    )
)

module.exports = Request
