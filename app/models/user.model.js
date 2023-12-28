const mongoose = require('mongoose')

const User = mongoose.model(
  'User',
  new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      username: String,
    gender: Boolean,
    point: Number,
    phone: String,
      average_rating:Number ,
    date_of_birth: Date,
    active: Boolean,
      address:String,
    activity_intensity: Number,
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ]
  },{timestamps: true})
)

module.exports = User
