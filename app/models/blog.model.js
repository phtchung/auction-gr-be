const mongoose = require('mongoose')

const Blog = mongoose.model(
    'Blog',
    new mongoose.Schema({
            sub_image: String,
            image: String,
            release_date: Date,
            title: String,
            subtitle3: String,
            subtitle1: String,
            subtitle2: String,
            content: String,
            author: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
        },
        {timestamps: true})
)

module.exports = Blog
