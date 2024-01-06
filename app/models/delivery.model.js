const mongoose = require('mongoose')

const Delivery = mongoose.model(
  'Delivery',
  new mongoose.Schema(
    {
      name: String,
      address: String,
      phone: String,
      status: {
        type: Number,
        enum: [5,6, 7, 8, 9, 10, 11, 12],
        default: 5
      },
      note: String,
      completed_at: Date,
      return_at: Date,
      delivery_start_at: Date,
        payment_method:String,
    },
    { timestamps: true }
  )
)

module.exports = Delivery
