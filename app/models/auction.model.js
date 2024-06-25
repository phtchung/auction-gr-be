const mongoose = require('mongoose')

const Auction = mongoose.model(
    'Auction',
    new mongoose.Schema(
        {
            winner_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            seller_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            request_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Request'
            },
            auction_name : String,
            delivery: {
                type: mongoose.Schema.Types.Mixed,
                default : {}
            },
            category_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            status: {
                type: Number,
                enum: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,14,15],
            },
            admin_belong: {
                type: Number,
                enum: [0,1],
            },
            deposit_price:Number,
            sale_price: Number,
            reserve_price: Number,
            step_price: Number,
            final_price: Number,
            shipping_fee: Number,
            min_price : Number,
            type_of_auction: {
                type: Number,
                enum: [-1, 1],
            },
            auction_live:{
                type:Number,
                enum:[0,1,2],
            },
            victory_time: Date,
            start_time: Date,
            finish_time: Date,
            approved_at: Date,
            request_time:Date,
            cancel_time:Date,
            // approved_at chính là created at của product trong bảng product
            view:{
                type:Number,
                default: 0
            },
            is_review : Number,
            review_before:Date,
            register_start : Date,
            register_finish : Date,
            room_id : String,
            url_stream:String,
            code_access: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Registration",
                },
            ],
            bids: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Bid",
                },
            ],
        },
        {timestamps: true}
    )
)

module.exports = Auction
