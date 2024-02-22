const Product = require('../models/product.model')
const mongoose = require('mongoose')
const Request = require('../models/request.model')

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
            .select('product_name product_delivery rank shipping_fee reserve_price final_price victory_time')
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
            status: {$in: [8, 11]},
            'product_delivery.completed_at': {
                $gte: new Date(start_time),
                $lte: new Date(finish_time)
            }
        }).select(' _id createdAt product_name final_price product_delivery.completed_at shipping_fee request_id status ')

        const total = {
            total_sale: products.length,
            total_completed: products.filter((req) => req.status === 8).length,
            total_cancel: products.filter((req) => req.status === 11).length,
            total_price_sale: products.reduce((total, sale) => total + (sale.final_price || 0), 0),
            total_price_completed: products.reduce(
                (total, sale) => (sale.status === 8 ? total + (sale.final_price || 0) : total),
                0
            ),
            total_price_cancel: products.reduce(
                (total, sale) => (sale.status === 11 ? total + (sale.final_price || 0) : total),
                0
            )
        }

        res.status(200).json({products, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getWinOrderList = async (req, res) => {
    try {
        const userId = req.userId
        const status = req.body.status
        let winOrderList

        if (status === 567) {
            winOrderList = await Product.find({
                winner_id: new mongoose.Types.ObjectId(userId),
                status: {$in: [5, 6, 7]}
            })
        } else {
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
            status: 9
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

        const penR = await Request.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 1
        })

        const appR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 2
        })

        const bidR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 3
        })

        const sucR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 5
        })

        const cfR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 6
        })

        const dlvR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 7
        })
        const cplR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 8
        })
        const failR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 10
        })
        const calR = await Product.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 11
        })
        const rejR = await Request.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 13
        })

        const countReq = {
            count_penR: penR.length,
            count_appR: appR.length,
            count_bidR: bidR.length,
            count_sucR: sucR.length,
            count_cfR: cfR.length,
            count_dlvR: dlvR.length,
            count_cplR: cplR.length,
            count_failR: failR.length,
            count_calR: calR.length,
            count_rejR: rejR.length
        }

        res.status(200).json(countReq)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getRequestOrderList = async (req, res) => {
    try {
        const userId = req.userId
        const status = req.body.status

        let reqOrderList
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
                        completed_time:now,
                    }
                })
        }else if(status === 7 || newStatus === 9){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    winner_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        return_time:now,
                    }
                })
        }
        else if(status === 5 || status === 6){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    seller_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        // completed_time:red.body?.completed_time,
                    }
                })
        }
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' })
        }

        return res.status(200).json({message:'Update success'})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

