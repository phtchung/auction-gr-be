const mongoose = require('mongoose')

const Notification = mongoose.model(
    'Notification',
    new mongoose.Schema(
        {
            title: String,
            content: String,
            url: String,
            receiver: [String],
            type: Number,

        },
        {timestamps: true}
    )
)
module.exports = Notification
