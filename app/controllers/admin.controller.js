// Import cần thiết
const { mongoose } = require('mongoose')

const User = require('../models/user.model')

// Middleware xác thực JWT
const authJwt = require('../middlewares/authJwt')
const Product = require("../models/product.model");
const Request = require("../models/request.model");

// API để lấy thông tin cá nhân của người dùng hiện tại
exports.adminBoard = (req, res) => {
  res.status(200).send('Admin Content.')
}

exports.adminGetRequestCount = async (req, res) => {
  try {
    const countNewReq = await Request.countDocuments({ status: 1 })

    const countApproved = await Request.countDocuments({
      status: 2
    })

    const countReject = await Request.countDocuments({
      status: 13
    })

    const countCancel = await Product.countDocuments({
      status: 11
    })
    const countBidding = await Product.countDocuments({
      status: 3
    })
    const countAdminReqTracking = {
      countNewReq,
      countApproved,
      countReject,
      countCancel,
      countBidding,
    }
    res.status(200).json(countAdminReqTracking)
  } catch (error) {
    res.status(500).json({message: 'Internal server error' + error})
  }
}

exports.adminGetRequestList = async (req, res) => {
  try {
    const status = req.body.status
    let adminRequestList

    if (status === 1 || status === 2 || status === 13) {
      adminRequestList = await Request.find({
        status: status
      }).populate('seller_id', 'username phone')
    } else {
      adminRequestList = await Product.find({
        status: status
      }).populate('seller_id category_id', 'name phone')
    }

    res.status(200).json({adminRequestList, status})
  } catch (error) {
    res.status(500).json({message: 'Internal server error' + error})
  }
}
