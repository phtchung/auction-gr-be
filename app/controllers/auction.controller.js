const mongoose = require('mongoose')
const Product = require('../models/product.model')
const Auction = require('../models/auction.model')

exports.getBiddingList = async (req, res) => {
    try {
        const userId = req.userId

        const product_biddings = await Auction.aggregate([
            {
                $match: {user: new mongoose.Types.ObjectId(userId)}
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
                $match: {product_id: {$in: productIds}}
            },
            {
                $sort: {bid_price: -1}
            },
            {
                $group: {
                    _id: '$product_id',
                    document: {$first: '$$ROOT'}
                }
            },
            {$replaceRoot: {newRoot: '$document'}}
        ])
        const products = biddingInfor.length > 0 ? biddingInfor.map((item) => item.product_id) : []

        const data = await Product.find({_id: {$in: products}})
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
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.createProductBid = async (req, res) => {

    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)

        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status : 3,
                start_time: {$lt: new Date()},
                finish_time: {$gt: new Date()},
                $or: [
                    { final_price: { $lt: parseInt(req.body.final_price)} },
                    { final_price: { $exists: false } },
                ],
            },
            {
                $set: {
                   final_price:req.body.final_price,
                    winner_id:winner_id,
                }
            })
        if (!product) {
            return res.status(404).json({message: 'Giá đưa ra thấp hơn giá hiện tại'})
        }else{
            const bid = new Auction({
                product_id:new mongoose.Types.ObjectId(productId),
                user: new mongoose.Types.ObjectId(userId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            await bid.save();
        }

        res.status(200).json({message:'Thực hiện trả giá thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getAuctionProductBidCount = async (req, res) => {
    try {
        const Id = req.params.productId

        const  bidCount = await Auction.countDocuments({
            product_id: new mongoose.Types.ObjectId(Id),
        })

        if (!bidCount) {
            return res.status(404).json({message: 'Không tìm thấy sản phẩm'})
        }

        res.status(200).json({bidCount : bidCount})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
