const mongoose = require('mongoose')

const Registration = mongoose.model(
    'Registration',
    new mongoose.Schema(
        {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            code: {
                type: String,
                required: true,
            },
            payment_method : Number,
        },
        { timestamps: true }
    )
)

module.exports =  Registration;
