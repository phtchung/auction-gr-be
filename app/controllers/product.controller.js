const Product = require('../models/product.model')
const mongoose = require('mongoose')
const Request = require('../models/request.model')
const {userRequestStatus, userWinOrderList} = require("../utils/constant");

exports.getAuctionHistory = async (req, res) => {
    try {
        const userId = req.userId
        const status = req.body.status
        const products = await Product.find({winner_id: new mongoose.Types.ObjectId(userId), status})
            .lean()
            .populate('seller_id', 'name')

        res.status(200).json(products)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
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
            .select('product_name main_image product_delivery rank shipping_fee reserve_price final_price victory_time')
            .lean()

        res.status(200).json(product)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getSaleHistory = async (req, res) => {
    try {
        const userId = req.userId
        const start_time = req.query.start_time
        const finish_time = req.query.finish_time
        const products = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [8, 10,14]},
            updatedAt: {
                $gte: new Date(start_time),
                $lte: new Date(finish_time)
            }
        }).select(' _id createdAt product_name request_time final_price product_delivery.completed_time updatedAt shipping_fee request_id status ')

        const total = {
            total_sale: products.length,
            total_completed: products.filter((req) => req.status === 8).length,
            total_failure: products.filter((req) => req.status === 10).length,
            total_return: products.filter((req) => req.status === 14).length,
        }

        res.status(200).json({products, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getWinOrderList = async (req, res) => {
    try {
        const userId = req.userId
        const status = userWinOrderList(req.body?.status)
        let winOrderList

        if (status === 567) {
            winOrderList = await Product.find({
                winner_id: new mongoose.Types.ObjectId(userId),
                status: {$in: [5, 6, 7]}
            })
        }else if(status === 914){
            winOrderList = await Product.find({
                winner_id: new mongoose.Types.ObjectId(userId),
                status: {$in: [9, 14]}
            })
        }
        else {
            winOrderList = await Product.find({
                winner_id: new mongoose.Types.ObjectId(userId),
                status: status
            })
        }

        res.status(200).json({winOrderList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getWinCount = async (req, res) => {
    try {
        const userId = req.userId

        const AucW = await Product.find({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 4
        })

        const DlvW = await Product.find({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [5, 6, 7]}
        })

        const CplW = await Product.find({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 8
        })

        const CanW = await Product.find({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 11
        })
        const ReW = await Product.find({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [9, 14]}
        })
        const countWin = {
            count_AucW: AucW.length,
            count_DlvW: DlvW.length,
            count_Cpl: CplW.length,
            count_Can: CanW.length,
            count_Ret: ReW.length
        }

        res.status(200).json(countWin)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getWinOrderDetail = async (req, res) => {
    try {
        const userId = req.userId
        const productId = req.params.productId

        const product = await Product.findOne({
            winner_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(productId)
        }).populate('seller_id category_id', 'name phone')

        res.status(200).json(product)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getReqCount = async (req, res) => {
    try {
        const userId = req.userId

        const count_penR = await Request.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 1
        })

        const count_appR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 2
        })

        const count_bidR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [3, 4] },
        })

        const count_sucR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 5
        })

        const count_cfR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 6
        })

        const count_dlvR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 7
        })
        const count_cplR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 8
        })
        const count_failR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 10
        })
        const count_retR = await Product.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [9, 14] },
        })
        const count_rejR = await Request.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 13
        })

        const countReq = {
            count_penR,
            count_appR,
            count_bidR,
            count_sucR,
            count_cfR,
            count_dlvR,
            count_cplR,
            count_failR,
            count_retR,
            count_rejR,
        }

        res.status(200).json(countReq)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getRequestOrderList = async (req, res) => {
    try {
        const userId = req.userId
        const status = userRequestStatus(req.body?.status)

        let reqOrderList
        if(status === 34){
            reqOrderList = await Product.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [3, 4] },
            })
            return res.status(200).json({reqOrderList, status})
        }
        if(status === 914){
            reqOrderList = await Product.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [9,14] },
            })
            return res.status(200).json({reqOrderList, status})
        }
        if(status === 1011){
            reqOrderList = await Product.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [10,11] },
            })
            return res.status(200).json({reqOrderList, status})
        }
        if (status === 1 || status === 13) {
            reqOrderList = await Request.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: status
            })
        } else {
            reqOrderList = await Product.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: status
            })
        }

        res.status(200).json({reqOrderList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getReqOrderDetail = async (req, res) => {
    try {
        const userId = req.userId
        const Id = req.params.productId
        let product

        product = await Product.findOne({
            seller_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(Id)
        }).populate('seller_id category_id request_id', 'name phone createdAt')

        if (!product) {
            product = await Request.findOne({
                seller_id: new mongoose.Types.ObjectId(userId),
                _id: new mongoose.Types.ObjectId(Id)
            }).populate('seller_id category_id', 'name phone')
        }

        res.status(200).json(product)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.updateByWinner = async (req, res) => {
    try {
        const userId = req.userId
        const newStatus =parseInt( req.body.newState)
        const productId = req.body?.product_id
        const status = req.body?.state
        var product
        const now = new Date()
        if(status === 7 && newStatus === 8 ){
             product = await Product.findOneAndUpdate({
                     _id: new mongoose.Types.ObjectId(productId),
                     winner_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.completed_time': now

                    }
                })
        }else if(status === 7 && newStatus === 9){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    winner_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.return_time': now

                    }
                })
        }
        else if(status === 5){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    seller_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.confirm_time': now

                    }
                })
        } else if(status === 6){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    seller_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.delivery_start_time': now
                    }
                })
        }
        if (!product || product.status !== status) {
            return res.status(404).json({ message: 'Product not found.' })
        }

        return res.status(200).json({message:'Update success'})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

