const { mongoose } = require('mongoose')
const User = require('../models/user.model')
const Role = require('../models/role.model')
exports.allAccess = (req, res) => {
  res.status(200).send('Public Content.')
}

exports.userBoard = (req, res) => {
  res.status(200).send('User Content.')
}

exports.getMyProfile = async (req, res) => {
  try {
    // Lấy thông tin người dùng hiện tại từ JWT token đã xác thực
    const userId = req.userId

    // Sử dụng Mongoose để tìm người dùng dựa trên userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    // Lấy danh sách các vai trò của người dùng
    const roles = await Role.find({ _id: { $in: user.roles } })

    // Loại bỏ mật khẩu khỏi thông tin người dùng
    const userWithoutPassword = {
      _id: user._id,
      email: user.email,
      roles: roles.map((role) => role.name)
    }

    res.status(200).json(userWithoutPassword)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
