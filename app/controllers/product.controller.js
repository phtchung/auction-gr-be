const User = require('../models/user.model')
const Delivery = require('../models/delivery.model')
const Product = require('../models/product.model')
const mongoose = require('mongoose')

exports.getAuctionHistory = async (req, res) => {
  try {
    const userId = req.userId
    console.log(req.body)

    const status = req.body.status
    console.log(userId, status)

    const products = await Product.find({ winner_id: new mongoose.Types.ObjectId(userId), status })
      .populate('seller_id')
      .lean()

    const productIds = products.map((product) => product._id)
    const deliveries = await Delivery.find({ product_id: { $in: productIds } }).lean()

    const productsWithDeliveries = products.map((product) => {
      const delivery = deliveries.find((delivery) => String(delivery.product_id) === String(product._id))
      return {
        _id: product._id,
        seller_name: product.seller_id?.name,
        product_name: product.product_name,
        rank: product.rank,
        reserve_price: product.reserve_price,
        final_price: product.final_price,
        completed_at: delivery?.completed_at
      }
    })

    res.status(200).json(productsWithDeliveries)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' + error })
  }
}

exports.getAuctionHistoryDetail = async (req, res) => {
  try {
    const userId = req.userId
    const productId = req.params.productId
    const product = await Product.findOne({
      winner_id: new mongoose.Types.ObjectId(userId),
      _id: new mongoose.Types.ObjectId(productId)
    })
      .select('product_name rank shipping_fee reserve_price final_price victory_time')
      .lean()

    const delivery = await Delivery.findOne(
      { product_id: new mongoose.Types.ObjectId(productId) },
      { _id: 0, product_id: 0 }
    )
      .select('completed_at name address phone note delivery_start_at createdAt')
      .lean()

    res.status(200).json({ ...product, ...delivery })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' + error })
  }
}
