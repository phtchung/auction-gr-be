const mongoose = require('mongoose')

const Product = mongoose.model(
  'Product',
  new mongoose.Schema(
    {
      winner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      request_id: String,
      product_name: String,
      category_id: String,
      status: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        default: 2
      },
      sale_price: Number,
      reserve_price: Number,
      step_price: Number,
      final_price: Number,
      shipping_fee: Number,
      rank: String,
      type_of_auction: Number,
      description: String,
      main_image: String,
      victory_time: Date,
      procedure_complete_time: Date,
      start_time: Date,
      finish_time: Date,
      image_list: [String]
    },
    { timestamps: true }
  )
)

module.exports = Product
