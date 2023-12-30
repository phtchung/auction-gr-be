const mongoose = require('mongoose')

const Review = mongoose.model(
  'Review',
  new mongoose.Schema(
    {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      rating: Number,
      comment: String,
      rv_image_list: [String]
    },
    { timestamps: true }
  )
)

module.exports = Review
