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
        enum: [6, 7, 8, 9, 10, 11, 12],
        default: 6
      },
      note: String,
      completed_at: Date,
      return_at: Date,
      delivery_start_at: Date
    },
    { timestamps: true }
  )
)

module.exports = Delivery
