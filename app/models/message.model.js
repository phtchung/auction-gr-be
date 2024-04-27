const mongoose = require('mongoose')

const Message = mongoose.model(
    'Message',
    new mongoose.Schema(
        {
            senderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            receiverId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            message: {
                type: String,
                required: true,
            },
        },
        { timestamps: true }
    )
)

module.exports =  Message;
