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
            auction_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Auction",
                required: true,
            },
            code: {
                type: String,
                required: true,
            },
            payment_method : Number,
            code_access : String,
        },
        { timestamps: true }
    )
)

module.exports =  Registration;
