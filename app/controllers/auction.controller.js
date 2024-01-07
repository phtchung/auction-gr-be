const mongoose = require('mongoose')
const Product = require('../models/product.model')
const Auction = require('../models/auction.model')
const { da } = require('@faker-js/faker')

exports.getBiddingList = async (req, res) => {
  try {
    const userId = req.userId

    const product_biddings = await Auction.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$product_id'
        }
      }
    ])
    const productIds = product_biddings.length > 0 ? product_biddings.map((item) => item._id) : []

    const biddingInfor = await Auction.aggregate([
      {
        $match: { product_id: { $in: productIds } }
      },
      {
        $sort: { bid_price: -1 }
      },
      {
        $group: {
          _id: '$product_id',
          document: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$document' } }
    ])
    const products = biddingInfor.length > 0 ? biddingInfor.map((item) => item.product_id) : []

    const data = await Product.find({ _id: { $in: products } })
      .select('product_name rank start_time reserve_price seller_id finish_time')
      .populate('seller_id', 'name average_rating')
      .lean()

    const mergedArray = data.map((product) => {
      const correspondingBid = biddingInfor.find((bid) => bid.product_id.equals(product._id))

      return {
        ...product,
        bid_price: correspondingBid.bid_price,
        bidder: correspondingBid.username
      }
    })

    return res.status(200).json(mergedArray)
  } catch (err) {
    return res.status(500).json({ message: 'DATABASE_ERROR', err })
  }
}
