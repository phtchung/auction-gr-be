const mongoose = require('mongoose')

const Product = mongoose.model(
    'Product',
    new mongoose.Schema(
        {
            winner_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            seller_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            request_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Request'
            },
            product_delivery: {type: mongoose.Schema.Types.Mixed},
            isDeliInfor : {
                type: Number,
                enum: [1,0],

            },
            product_name: String,
            category_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            payment_method: String,
            status: {
                type: Number,
                enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,14,15],
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
            rank: String,
            type_of_auction: Number,
            description: String,
            main_image: String,
            brand:String,
            is_used:{
                type:Number,
                enum:[0,1],
            },
            auction_live:{
                type:Number,
                enum:[0,1,2],
            },
            delivery_from:String,
            can_return:{
                type:Number,
                enum:[0,1],
            },
            delivery_before :Date,
            //delivevery before dành cho ng bán , phải giao hàng trước thời gian này
            victory_time: Date,
            procedure_complete_time: Date,
            start_time: Date,
            finish_time: Date,
            approved_at: Date,
            request_time:Date,
            cancel_time:Date,
            // approved_at chính là created at của product trong bảng product
            image_list: [String],
            view:{
                type:Number,
                default: 0
            },
            is_review : Number,
            review_before:Date,
            register_time : Date,
            room_id : String,
            code_access: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Registration",
                },
            ],
        },
        {timestamps: true}
    )
)

module.exports = Product
