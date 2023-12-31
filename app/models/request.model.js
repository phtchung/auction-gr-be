const mongoose = require('mongoose')

const Request = mongoose.model(
  'Request',
  new mongoose.Schema(
    {
      seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      category_id: String,
      product_name: String,
      status: {
        type: Number,
        enum: [1, 2, 11],
        default: 1
      },
      sale_price: Number,
      reserve_price: Number,
      step_price: Number,
      shipping_fee: Number,
      rank: String,
      description: String,
      main_image: String,
      reason: String,
      reject_time: Date,
      approved_time: Date,
      start_time: Date,
      finish_time: Date,
      image_list: [String]
    },
    { timestamps: true }
  )
)

module.exports = Request
