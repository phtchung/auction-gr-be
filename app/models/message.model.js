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
            status : {
                type : Number,
                enum : [0,1],
                default : 0
            }
        },
        { timestamps: true }
    )
)

module.exports =  Message;
