const mongoose = require('mongoose')

const Return = mongoose.model(
    'Return',
    new mongoose.Schema(
        {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            return_reason: String,
            rt_image_list: [String]
        },
        { timestamps: true }
    )
)

module.exports = Return
