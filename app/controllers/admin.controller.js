// Import cần thiết
const { mongoose } = require('mongoose')

const User = require('../models/user.model')

// Middleware xác thực JWT
const authJwt = require('../middlewares/authJwt')

// API để lấy thông tin cá nhân của người dùng hiện tại
exports.adminBoard = (req, res) => {
  res.status(200).send('Admin Content.')
}
