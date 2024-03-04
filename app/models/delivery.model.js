const mongoose = require('mongoose')

const Delivery = mongoose.model(
    'Delivery',
    new mongoose.Schema(
        {
            name: String,
            address: String,
            phone: String,
            status: {
                type: Number,
                enum: [5, 6, 7, 8, 9, 10, 11, 12],
                default: 5
            },
            note: String,
            completed_time: Date,
            return_time: Date,
            delivery_start_time: Date,
            approve_return_time:Date,
            confirm_time: Date,
            payment_method: String,
            return_reason: String,
            return_image_list: [String],
            return_video: String,
        },
        {timestamps: true}
    )
)

module.exports = Delivery
