const mongoose = require('mongoose')

const Category = mongoose.model(
    'Category',
    new mongoose.Schema({
        name: String,
        children: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        }],
    })
)

module.exports = Category
