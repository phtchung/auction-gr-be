const mongoose = require('mongoose')
const Product = require('../models/product.model')
const Auction = require('../models/auction.model')
const User = require("../models/user.model");


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

        const data = await Product.find(
            {_id: {$in: products},
                status:3},
        )
            .select('product_name _id rank start_time reserve_price seller_id finish_time main_image')
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

        if(userId === winner_id ){
            return res.status(404).json({message: 'Không được đấu giả sản phẩm của mình'})
        }
        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status : 3,
                start_time: {$lt: new Date()},
                finish_time: {$gt: new Date()},
                seller_id: { $ne: winner_id } ,
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
            return res.status(404).json({message: 'Không đủ điều kiện tham gia đấu giá'})
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
        return res.status(500).json({message: 'Không đủ điều kiện tham gia đấu giá', err})
    }
}

exports.getAuctionProductBidCount = async (req, res) => {
    try {
        const Id = req.params.productId

        const  bidCount = await Auction.countDocuments({
            product_id: new mongoose.Types.ObjectId(Id),
        })

        res.status(200).json({bidCount : bidCount})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.createProductBuy = async (req, res) => {

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
                seller_id: { $ne: winner_id } ,
                $or: [
                    { sale_price: parseInt(req.body.final_price) },
                    { final_price: { $exists: false } },
                ],
            },
            [
            {
                $set: {
                    status:4,
                    final_price:req.body.final_price,
                    winner_id:winner_id,
                    victory_time:new Date(),
                    isDeliInfor:0,
                    procedure_complete_time: { $add: ["$finish_time", 2 * 24 * 60 * 60 * 1000] },
                }
            }]
        )
        if (!product) {
            return res.status(404).json({message: 'Không đủ điều kiện mua sản phẩm'})
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

exports.getProductOfSeller = async (req, res) => {
    try {

        const seller = req.params.seller
        const  user = await User.findOne({
            username: seller
        }).select('average_rating name username point product_done_count rate_count')
        if (!user) {
            return res.status(404).json({message: 'Không tìm thấy người bán nào'})
        }
        var products = await Product.find({
            seller_id : new mongoose.Types.ObjectId(user._id),
            status : 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
        })
        if(products.length !== 0){
            for (let i = 0; i < products.length; i++) {
                const count = await Auction.aggregate([
                    {$match: {product_id: products[i]._id}},
                    {$group: {_id: "$product_id", count: {$sum: 1}}}
                ]);
                if (count.length > 0) {
                   products[i] = {...products[i]._doc,...count[0]}
                 }else{
                    products[i] = {...products[i]._doc,count:0}
                }

            }
        }

        res.status(200).json({user:user,products : products})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
