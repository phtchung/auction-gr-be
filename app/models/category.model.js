const mongoose = require('mongoose')

const Category = mongoose.model(
    'Category',
    new mongoose.Schema({
        name: String,
        image:String,
        parent: {
            type: mongoose.Types.ObjectId,
            ref: 'Category',
            default:null
        },
        status:{
            enum:[0,1],
            type:Number,
            default:0
        }
    },{timestamps: true})
)

module.exports = Category
