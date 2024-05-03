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
            average_rating: Number,
            date_of_birth: Date,
            active: {
                type : Boolean,
                default : true
            },
            address: String,
            avatar:String,
            product_done_count: Number,
            // số lượng người đánh giá
            rate_count:Number,
            activity_intensity: Number,
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
