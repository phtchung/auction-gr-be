const Product = require('../models/product.model')
const mongoose = require('mongoose')
const Request = require('../models/request.model')
const  Categories= require('../models/category.model')
const {userRequestStatus, userWinOrderList, createTitleWinner, createContentWinner, createTitleSeller, createContentSeller
} = require("../utils/constant");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const sse = require("../sse");
const {updateByWinner, UserReturnProduct} = require("../service/product.service");
const {da} = require("@faker-js/faker");
const Notification = require('../models/notification.model')
const Auction = require("../models/auction.model");


exports.getAuctionHistory = async (req, res) => {
    try {
        const userId = req.userId
        const status = req.body.status
        const products = await Auction.find(
            {winner_id: new mongoose.Types.ObjectId(userId), status})
            .sort({ updatedAt: -1 })
            .select('product_name rank reserve_price final_price product_delivery main_image is_review review_before')
            .lean()
            .populate('seller_id', 'name')
            .populate('product_id')

        res.status(200).json(products)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getAuctionHistoryDetail = async (req, res) => {
    try {
        const userId = req.userId
        const productId = req.params.productId
        const product = await Auction.findOne({
            winner_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(productId)
        })
            .select('delivery shipping_fee reserve_price final_price victory_time')
            .populate('seller_id','name username')
            .populate('product_id','product_name main_image rank')
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
        const products = await Auction.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [8, 10,14]},
            updatedAt: {
                $gte: new Date(start_time),
                $lte: new Date(finish_time)
            }
        }).select(' _id createdAt auction_name request_time final_price delivery.completed_time updatedAt shipping_fee request_id status ')

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

        let query = {
            winner_id: new mongoose.Types.ObjectId(userId),
        }

        if (status === 567){
            query.status =  {$in: [5, 6, 7]}
        }else if(status === 91415){
            query.status =  {$in: [9, 14,15]}
        }else {
            query.status = status
        }

        const winOrderList = await Auction
            .find(query)
            .populate('product_id')

        res.status(200).json({winOrderList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getWinCount = async (req, res) => {
    try {
        const userId = req.userId

        const AucW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 4
        })

        const DlvW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [5, 6, 7]}
        })

        const CplW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 8
        })

        const CanW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 11
        })
        const ReW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [9, 14,15]}
        })
        const countWin = {
            count_AucW: AucW,
            count_DlvW: DlvW,
            count_Cpl: CplW,
            count_Can: CanW,
            count_Ret: ReW
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

        const product = await Auction.findOne({
            winner_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(productId)
        }).populate('seller_id category_id', 'name phone')
            .populate('product_id')
        if (!product){
            return res.status(404).json('Không tìm thấy sản phẩm')
        }

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

        const count_appR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 2
        })

        const count_bidR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [3, 4] },
        })

        const count_sucR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 5
        })

        const count_cfR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 6
        })

        const count_dlvR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 7
        })
        const count_cplR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 8
        })
        const count_failR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [10,11]},
        })
        const count_retR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [9, 14,15] },
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
            reqOrderList = await Auction.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [3, 4] },
            })
                .populate('product_id')

            return res.status(200).json({reqOrderList, status})
        }
        if(status === 91415){
            reqOrderList = await Auction.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [9,14,15] },
            })
                .populate('product_id')

            return res.status(200).json({reqOrderList, status})
        }
        if(status === 1011){
            reqOrderList = await Auction.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: { $in: [10,11] },
            })
                .populate('product_id')

            return res.status(200).json({reqOrderList, status})
        }
        if (status === 1 || status === 13) {
            reqOrderList = await Request.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: status
            })
                .populate('product_id')

        } else {
            reqOrderList = await Auction.find({
                seller_id: new mongoose.Types.ObjectId(userId),
                status: status
            })
                .populate('product_id')

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

        product = await Auction.findOne({
            seller_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(Id)
        }).populate('seller_id winner_id category_id request_id', 'name phone createdAt')
            .populate('product_id')

        if (!product) {
            product = await Request.findOne({
                seller_id: new mongoose.Types.ObjectId(userId),
                _id: new mongoose.Types.ObjectId(Id)
            }).populate('seller_id category_id', 'name phone')
                .populate('product_id')
        }

        res.status(200).json(product)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.updateByWinnerController = async (req, res) => {
    const result = await updateByWinner(req);
    res.status(result.statusCode).json({message:'Update success'});
    if (!result.error) {
        const dataForWinner = new Notification({
            title : createTitleWinner(result.status),
            content : createContentWinner(result.status ,result.data._id.toString()),
            url :`/winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=${result.status}`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await dataForWinner.save()
        sse.send( dataForWinner, `updateStatus_${result.data.winner_id.toString()}`);
        if(result.status === 8){
            const dataForSeller = new Notification ({
                title : createTitleSeller(result.status),
                content : createContentSeller(result.status ,result.data._id.toString()),
                url :`/reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=${result.status}`,
                type : 1,
                receiver : [result.data.seller_id],
            })
            await dataForSeller.save()
            sse.send( dataForSeller, `updateStatus_${result.data.seller_id.toString()}`);
        }
    }
}

exports.UserReturnProductController = async (req, res) => {
    const result = await UserReturnProduct(req);
    res.status(result.statusCode).json(result.message);
    if (!result.error) {
        const dataForWinner = new Notification({
            title : 'Yêu cầu trả hàng',
            content : `Yêu cầu trả hàng #${result.data._id.toString()} đã được gửi đến quản trị viên`,
            url :`/winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=9`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await dataForWinner.save()
        const dataForSeller = new Notification({
            title : 'Yêu cầu trả hàng',
            content : `Đơn hàng #${result.data._id.toString()} đang được yêu cầu trả lại.`,
            url :`reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=9`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await dataForSeller.save()
        sse.send( dataForWinner, `returnProductWinner_${result.data.winner_id.toString()}`);
        sse.send( dataForSeller, `returnProductSeller_${result.data.seller_id.toString()}`);
    }
}

exports.getAuctionProductDetail = async (req, res) => {
    try {
        const Id = req.params.productId

        const  auctionProduct = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(Id),
            status: 3,
            auction_live:0,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date(), $exists: true},
        }).populate('seller_id category_id request_id', 'name average_rating parent username product_done_count rate_count point createdAt')
            .populate('product_id')

        if (!auctionProduct) {
            return res.status(404).json({message: 'Không tìm thấy sản phẩm'})
        }
        if(!auctionProduct.view){
            auctionProduct.view = 1
        }else {
            auctionProduct.view += 1
        }
        await auctionProduct.save()
        const parent = await Categories.findOne({
            _id : auctionProduct.category_id.parent
        }).select('_id name')

        res.status(200).json({...auctionProduct._doc,parent})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProductStreamDetail = async (req, res) => {
    try {
        const Id = req.params.productId

        const  product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(Id),
            auction_live: 2,
            register_finish: {$gt: new Date(), $exists: true},
            register_start: {$lt: new Date(), $exists: true},
        })
            .populate('seller_id category_id', 'name average_rating parent username product_done_count rate_count createdAt')
            .populate('product_id')

        if (!product) {
            return res.status(404).json({message: 'Không tìm thấy sản phẩm'})
        }
        if(!product.view){
            product.view = 1
        }else {
            product.view += 1
        }
        await product.save()
        const parent = await Categories.findOne({
            _id : product.category_id.parent
        }).select('_id name')

        res.status(200).json({...product._doc,parent})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProductRealTimeDetail = async (req, res) => {
    try {
        const Id = req.params.productId

        const  product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(Id),
            auction_live: 1,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date(), $exists: true},
            status : 3
        })
            .populate('seller_id category_id', 'name average_rating parent username product_done_count rate_count createdAt')
            .populate('product_id')

        if (!product) {
            return res.status(404).json({message: 'Không tìm thấy sản phẩm'})
        }
        if(!product.view){
            product.view = 1
        }else {
            product.view += 1
        }
        await product.save()
        const parent = await Categories.findOne({
            _id : product.category_id.parent
        }).select('_id name')

        res.status(200).json({...product._doc,parent})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
