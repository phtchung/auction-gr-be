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
      name: user.name,
      roles: roles.map((role) => role.name)
    }

    res.status(200).json(userWithoutPassword)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

exports.getUser = async (req, res) => {
  try {
    const userId = req.userId
    // Sử dụng Mongoose để tìm người dùng dựa trên userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const roles = await Role.find({ _id: { $in: user.roles } })

    const userWithoutPassword = {
      _id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      phone: user.phone,
      point: user.point,
      gender: user?.gender,
      date_of_birth: user?.date_of_birth
    }

    res.status(200).json(userWithoutPassword)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

exports.updateInfo = async (req, res) => {
  let userId = req.body.userId
  let birthday = req.body.date_of_birth || null
  let gender = req.body.gender !== undefined ? req.body.gender : null

  console.log(birthday, gender)
  if (birthday === null && gender === null) {
    return res.status(400).json({ message: 'BAD_REQUEST' })
  }
  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    if (birthday) {
      user.date_of_birth = birthday
    }
    if (gender !== null) {
      user.gender = gender
    }
    await user.save()

    return res.status(200).json({ message: 'UPDATE_SUCCESS' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'DATABASE_ERROR' })
  }
}
