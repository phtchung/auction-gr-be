const mongoose = require('mongoose')

const User = mongoose.model(
    'User',
    new mongoose.Schema(
        {
            email: {
                type : String,
                required : true,
                unique : true
            },
            password: {
                type : String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            following: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: [],
                },
            ],
            followers: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: [],
                },
            ],
            username: {
                type: String,
                required: true,
                unique: true,
            },
            gender: String,
            point: {
                type : Number,
                default : 100
            },
            shop_point: {
                type : Number,
                default : 100
            },
            phone: String,
            average_rating: {
                type : Number,
                default:0
            },
            date_of_birth: Date,
            active: {
                type : Boolean,
                default : true
            },
            premium: {
                type : Boolean,
                default : false
            },
            address: String,
            avatar:String,
            product_done_count: {
                type : Number,
                default:0
            },
            receiveAuctionSuccessEmail:{
                type : Boolean,
                default : false
            },
            // số lượng người đánh giá
            rate_count:{
                type : Number,
                default : 0
            },
            last_seen: Date,
            roles: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                }
            ]
        },
        {timestamps: true}
    )
)

module.exports = User
