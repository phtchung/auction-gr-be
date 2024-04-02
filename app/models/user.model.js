const mongoose = require('mongoose')

const User = mongoose.model(
    'User',
    new mongoose.Schema(
        {
            email: String,
            password: String,
            name: String,
            username: String,
            gender: String,
            point: Number,
            phone: String,
            average_rating: Number,
            date_of_birth: Date,
            active: Boolean,
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
