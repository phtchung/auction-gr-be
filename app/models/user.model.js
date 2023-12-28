const mongoose = require('mongoose')

const User = mongoose.model(
  'User',
  new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    age: Number,
    gender: Boolean,
    height: Number,
    weight: Number,
    bust: Number,
    waist: Number,
    hip: Number,
    activity_intensity: Number,
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ]
  })
)

module.exports = User
