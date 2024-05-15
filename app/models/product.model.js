const mongoose = require('mongoose')

const Product = mongoose.model(
    'Product',
    new mongoose.Schema(
        {
            product_name: String,
            category_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            rank: String,
            description: String,
            main_image: String,
            brand:String,
            is_used:{
                type:Number,
                enum:[0,1],
            },
            delivery_from:String,
            can_return:{
                type:Number,
                enum:[0,1],
            },
            image_list: [String],
        },
        {timestamps: true}
    )
)

module.exports = Product
