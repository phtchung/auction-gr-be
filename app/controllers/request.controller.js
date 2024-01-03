const Request = require('../models/request.model')
const Product = require('../models/product.model')
const Delivery = require('../models/delivery.model')

const mongoose = require('mongoose')

exports.getRequest = async (req, res) => {
  try {
    const userId = req.userId
    const start_time = req.query.start_time
    const finish_time = req.query.finish_time

    const requests = await Request.find({
      seller_id: new mongoose.Types.ObjectId(userId),
      createdAt: {
        $gte: new Date(start_time),
        $lte: new Date(finish_time)
      }
    }).select(' _id createdAt product_name status rank')

    const total = {
      total_request: requests.length,
      total_pending: requests.filter((req) => req.status === 1).length,
      total_approved: requests.filter((req) => req.status === 2).length,
      total_rejected: requests.filter((req) => req.status === 13).length
    }

    res.status(200).json({ requests, total })
  } catch (err) {
    return res.status(500).json({ message: 'DATABASE_ERROR', err })
  }
}

exports.getRequestDetail = async (req, res) => {
  try {
    const userId = req.userId
    const requestId = req.params.requestId

    const request = await Product.findOne({
      seller_id: new mongoose.Types.ObjectId(userId),
      request_id: new mongoose.Types.ObjectId(requestId)
    })

    const deliData = await Delivery.findOne({
      product_id: new mongoose.Types.ObjectId(request._id)
    }).select('address name phone note completed_at')

    res.status(200).json({ ...request._doc, deliData })
  } catch (err) {
    return res.status(500).json({ message: 'DATABASE_ERROR', err })
  }
}

exports.getRequestHistoryDetail = async (req, res) => {
  try {
    const userId = req.userId
    const requestId = req.params.requestId

    const request = await Request.findOne({
      seller_id: new mongoose.Types.ObjectId(userId),
      _id: new mongoose.Types.ObjectId(requestId)
    })

    res.status(200).json(request)
  } catch (err) {
    return res.status(500).json({ message: 'DATABASE_ERROR', err })
  }
}
