const mongoose = require('mongoose')

const Blog = mongoose.model(
    'Blog',
    new mongoose.Schema({
        image: String,
        release_date:Date,
        title:String,
        subtitle:String,
        subtitle1:String,
        subtitle2:String,
        subtitle3:String,

    },
        {timestamps: true})
)

module.exports = Blog
