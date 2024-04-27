const mongoose = require('mongoose')

const Conversation = mongoose.model(
    'Conversation',
    new mongoose.Schema(
        {
            participants:[
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
            messages: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Message",
                    default: [],
                },
            ],
        },
        {timestamps: true}
    )
)

module.exports = Conversation;
