const mongoose = require('mongoose')
const Product = require('../models/product.model')
const Auction = require('../models/auction.model')
const User = require("../models/user.model");
const Categories = require("../models/category.model");
const crypto = require("crypto");
require('dotenv').config()
const { customAlphabet } = require('nanoid')
const axios = require('axios')
const CryptoJS = require('crypto-js'); // npm install crypto-js
const {v1:uuid} = require('uuid'); // npm install uuid
const moment = require('moment');
const sse = require("../sse");
const {BuyProduct, finishAuctionProduct, checkoutProduct, finishAuctionOnline, CreateBid, BuyProductAuctionPriceDown} = require("../service/auction.service");
const Notification = require('../models/notification.model')
const main = require('../../server')
const {splitString, parseAdvance, formatDateTime, reqConvertType, canBidByPoint, getMinimumPoints,
    checkByAuctionDeposit, checkPackageRegis, isValidCardNumber, isValidExpiration, isValidCVC, isValidCardName
} = require("../utils/constant");
const {initAuctionSocket, activeAuctions} = require("../socket/socket");
const sendEmail = require("../utils/helper");
const Registration = require("../models/registration.model");
const Bid = require("../models/bid.model");
const Message = require("../models/message.model");
const {sendEmailAuctionSuccess} = require("../utils/helper");
const https = require("https");
const Request = require("../models/request.model");


exports.getBiddingList = async (req, res) => {
    try {
        const userId = req.userId
        const username = req.username
        const page = parseInt(req.query.page)
        const LIMIT = 5;

        const product_biddings = await Bid.aggregate([
            {
                $match: {username: username}
            },
            {
                $group: {
                    _id: '$auction_id',
                }
            },
            {
                $sort: {createdAt: -1}
            }
        ])

        const productIds = product_biddings.length > 0 ? product_biddings.map((item) => item._id) : []

        const biddingInfor = await Bid.aggregate([
            {
                $match: {auction_id: {$in: productIds}}
            },
            {
                $sort: {bid_price: -1}
            },
            {
                $group: {
                    _id: '$auction_id',
                    document: {$first: '$$ROOT'}
                }
            },
            {$replaceRoot: {newRoot: '$document'}}
        ])

        const products = biddingInfor.length > 0 ? biddingInfor.map((item) => item.auction_id) : []
        const query = {}
        query.status = 3
        query._id = {$in: products}
        const { keyword } = req.query
        if(keyword){
            query.auction_name = { $regex: keyword, $options: 'i' }
        }

        const data = await Auction.find(
            query
        )
            .select('_id auction_live start_time reserve_price seller_id finish_time ')
            .populate('product_id','product_name rank main_image')
            .populate('seller_id', 'name average_rating')
            .lean()
        if(data.length === 0){
            return res.status(200).json({data : [], currentPage : page , nextPage : null })
        }
        const mergedArray = data.map((product) => {
            const correspondingBid = biddingInfor.find((bid) => bid.auction_id.equals(product._id))

            return {
                ...product,
                bid_price: correspondingBid.bid_price,
                bidder: correspondingBid.username
            }
        })
        const countItem = mergedArray.length
        return res.status(200).json(
            {
                data : mergedArray.slice(page, page + LIMIT),
                currentPage : page ,
                nextPage :  page + LIMIT < countItem ? page + LIMIT : null
            })
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getFullBidOfProduct = async (req, res) => {
    try {
        const productId = req.params.product_id
        // phải lấy type của auction
        const auction = await Auction.findOne({
            _id : new mongoose.Types.ObjectId(productId)
        }).select('type_of_auction')
        let sort = {}
        if (auction.type_of_auction === 1){
            sort.createdAt = -1
        }else sort.createdAt = 1

        const fullBidList = await Bid.aggregate([
            {
                $match: {auction_id: new mongoose.Types.ObjectId(productId)}
            },
            {
                $sort: sort
            },
        ])

        return res.status(200).json({list : fullBidList})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR 1', err})
    }
}

exports.getAuctionProductBidCount = async (req, res) => {
    try {
        const Id = req.params.productId

        const bidCount = await Bid.countDocuments({
            auction_id: new mongoose.Types.ObjectId(Id),
        })

        res.status(200).json({bidCount: bidCount})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.CreateBidController = async (req, res) => {
    const result = await CreateBid(req);
    res.status(result.statusCode).json(result);
    if (result.notify) {
        const data1 = {
            winner: result.data.winner_id.toString(),
            final_price: result?.data?.final_price,
            url: '/',
        };

        const data = new Notification ( {
            title : 'Đấu giá thành công',
            content : `Bạn vừa đấu giá thành công sản phẩm #${result.data._id.toString()}`,
            url :`winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await data.save()
        sse.send(data1, `finishAuction_${result.data._id.toString()}`);
        sse.send( data, `buySuccess_${result.data.winner_id.toString()}`);
        const user = await User.findOne({
            _id : new mongoose.Types.ObjectId(result.data.winner_id)
        })
        let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`
        if(user.receiveAuctionSuccessEmail){
            await sendEmailAuctionSuccess({ email: user.email , productName : result.data?.auction_name , url, price : result.data.final_price , deadline : formatDateTime(result.data.delivery.procedure_complete_time)  })
        }
    }
}

exports.BuyProductController = async (req, res) => {
    const result = await BuyProduct(req);
    res.status(result.statusCode).json(result);
    if (!result.error) {
        const data1 = {
            winner: result.data.winner_id.toString(),
            final_price: result?.data?.final_price,
            url: '/',
        };

        const data = new Notification ( {
            title : 'Đấu giá thành công',
            content : `Bạn vừa đấu giá thành công sản phẩm #${result.data._id.toString()}`,
            url :`winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await data.save()
        sse.send(data1, `finishAuction_${result.data._id.toString()}`);
        sse.send( data, `buySuccess_${result.data.winner_id.toString()}`);
        const user = await User.findOne({
            _id : new mongoose.Types.ObjectId(result.data.winner_id)
        })
        let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`
        if(user.receiveAuctionSuccessEmail){
            await sendEmailAuctionSuccess({ email: user.email , productName : result.data?.auction_name , url, price : result.data.final_price , deadline : formatDateTime(result.data.delivery.procedure_complete_time)  })
        }
    }
}

exports.getProductOfSeller = async (req, res) => {
    try {
        const seller = req.params.seller
        const user = await User.findOne({
            username: seller
        }).select('average_rating name username point product_done_count rate_count')
        if (!user) {
            return res.status(404).json({message: 'Không tìm thấy người bán nào'})
        }
        var total_product = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(user._id),
            status: 3,
            auction_live : 0,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
        })

        res.status(200).json({user: user, total_product: total_product})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProductsByFilterSellerHome = async (req, res) => {
    try {
        const seller = req.params.id
        const user = await User.findOne({
            username: seller
        }).select('average_rating name username point product_done_count rate_count')
        if (!user) {
            return res.status(404).json({message: 'Không tìm thấy người bán nào'})
        }

        let query = {
            auction_live : 0
        };
        let sort = {}
        //cate con
        // if (req.query.subcate) {
        //     query.category_id = new mongoose.Types.ObjectId(req.query.subcate)
        // }else {
        //     const childs = await Categories.find({
        //         parent : new mongoose.Types.ObjectId(category._id)
        //     })
        //     query.category_id = { $in: childs.map(child => child._id)}
        // }
        // lọc giá
        const {minPrice , maxPrice } = req.query
        if(minPrice && maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { $and: [{ final_price: { $gt: parseInt(minPrice) } }, { final_price: { $lt: parseInt(maxPrice) } }] }] },
                { $and: [{ final_price: { $exists: false } }, { $and: [{ reserve_price: { $gt: parseInt(minPrice) } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }] },
            ]
        }else if(minPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $gt: parseInt(minPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $gt: parseInt(minPrice) } }] }
            ]
        }else if(maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $lt: parseInt(maxPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }
            ]
        }

        // lọc nâng cao
        if (req.query.advance) {
            if (Array.isArray(req.query.advance)) {
                req.query.advance.map((item) => {
                    parseAdvance(item,query)
                });
            } else {
                parseAdvance(req.query.advance,query)
            }
        }

        // trạng thái đã sd hay chưa
        if (req.query.state) {
            if (!Array.isArray(req.query.state)) {
                const products = await Product.find({ is_used: parseInt(req.query.state) }, '_id');
                const productIds = products.map(product => product._id);
                if(productIds.length > 0 ){
                    query.product_id = { $in: productIds };
                }
            }
        }


        if (req.query.sortBy) {
            const parts = splitString(req.query.sortBy)
                if(parts[0] !== 'bid_count'){
                sort[parts[0]] = parts[1]
            }else {
                    sort['bids'] = parts[1]
                }
        }
        const { keyword } = req.query
        if(keyword){
            query.auction_name = { $regex: keyword, $options: 'i' }
        }

        const page = parseInt(req.query.page) - 1 || 0
        const limit = 15

        query.status = 3
        query.seller_id = new mongoose.Types.ObjectId(user._id)

        if(query.start_time){
            query.start_time.$lt = new Date(Date.now());
        }else {
            query.start_time = {
                $lt: new Date(Date.now())
            };
        }
        if(query.finish_time){
            query.finish_time.$gt = new Date(Date.now());
        }else {
            query.finish_time = {
                $gt: new Date(Date.now())
            };
        }

        const products = await Auction.find(query)
            .sort(sort)
            .skip(page*limit)
            .limit(limit)
            .populate('product_id','product_name main_image')

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        if (products.length !== 0) {
            for (let i = 0; i < products.length; i++) {
                // const count = await Bid.aggregate([
                //     {$match: {auction_id: products[i]._id}},
                //     {$group: {_id: "$auction_id", count: {$sum: 1}}}
                // ])
                const count = products[i].bids.length
                if (count > 0) {
                    products[i] = {...products[i]._doc, count : count}
                } else {
                    products[i] = {...products[i]._doc, count: 0}
                }
            }
        }

        //cái sort giá này bị lỗi
        // if(req.query.sortBy){
        //     if(req.query.sortBy ===  'bid_count-asc'){
        //         products.sort((a, b) => a.count - b.count);
        //     }else
        //         products.sort((a, b) => b.count - a.count);
        // }

        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products
        }
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.finishAuctionOnlineController = async (req, res) => {
    const result = await finishAuctionOnline(req);
    res.status(result.statusCode).json(result);
    if (!result.error && result.data?.winner_id) {
        const data = {
            title : 'Đấu giá thành công',
            content : `Bạn vừa đấu giá thành công sản phẩm #${result.data._id.toString()}`,
            url :'',
            type : 1,
            receiver : [result.data?.winner_id],
        }
        sse.send( data, `buySuccess_${result.data?.winner_id.toString()}`);
    }
}

exports.finishAuctionProductController = async (req, res) => {
    const result = await finishAuctionProduct(req);
    res.status(result.statusCode).json(result);
    if (!result.error) {
        const data = {
            title : 'Đấu giá thành công',
            content : `Bạn vừa đấu giá thành công sản phẩm #${result.data._id.toString()}`,
            url :'',
            type : 1,
            receiver : [result.data?.winner_id],
        }
        sse.send( data, `buySuccess_${result.data?.winner_id.toString()}`);
    }
}

exports.checkoutProductController = async (req, res) => {
    const result = await checkoutProduct(req);
    // const { error, message, statusCode, payUrl } = result;
    // const newRs = { error, message, statusCode, payUrl };
    res.status(result.statusCode).json(result);
    if (!result.error) {
        const temp = new Date()
        temp.setDate(temp.getDate() + 6);
        temp.setHours(23, 59, 0, 0);
        await Auction.findOneAndUpdate(
            {
                _id: result.data._id,
                status: 5,
            },
            { $set: { 'delivery.delivery_before': new Date(temp.toISOString()) } },
        );
        const data = new Notification ({
            title : 'Đấu giá thành công',
            content : `Sản phẩm #${result.data._id.toString()} đã được đấu giá thành công. Mau xác nhận đơn hàng trươớc ${formatDateTime(temp)}!`,
            url :`/reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=5`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await data.save()
        sse.send( data, `auctionSuccess_${result.data.seller_id.toString()}`);
    }
}

// exports.checkoutProduct = async (req, res) => {
//     try {
//         const userId = req.userId
//         const product = await Product.findOne({
//             _id: new mongoose.Types.ObjectId(req.body.product_id)
//         })
//         if (product.status === 4) {
//             // = 0 tiền mặt , bằng 1 : momo , bằng 2 : vnpay
//             if(req.body?.payment_method === 0){
//                 const delivery = new Delivery({
//                     name: req.body.name,
//                     payment_method: "Tiền mặt",
//                     address: req.body.address,
//                     phone: req.body.phone,
//                     status: 5,
//                     _id: new mongoose.Types.ObjectId(req.body.product_id)
//                 })
//                 const newDlv = await delivery.save()
//                 delete newDlv._id
//                 const product = await Product.findOneAndUpdate(
//                     {
//                         _id: new mongoose.Types.ObjectId(req.body.product_id),
//                         winner_id: new mongoose.Types.ObjectId(userId)
//                     },
//                     {product_delivery: newDlv, status: 5, isDeliInfor:1},
//                     {new: true}
//                 )
//                 return res.status(200).json({message: 'Thành công',payUrl :process.env.redirectUrl})
//             }else if(req.body?.payment_method === 1){
//                 var partnerCode = "MOMO"
//                 // var accessKey = process.env.accessKey;
//                 // var secretkey = process.env.
//                 var accessKey = 'F8BBA842ECF85';
//                 var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
//                 // chuỗi ngẫu nhiên để phân biệt cái request
//                 var requestId = partnerCode + new Date().getTime() + "id";
//                 // mã đặt đơn
//                 var orderId = new Date().getTime() + ":0123456778";
//                 //
//                 var orderInfo = "Thanh toán sản phẩm "+ product.product_name;
//                 // cung cấp họ về một cái pages sau khi thanh toán sẽ trở về trang nớ
//                 var redirectUrl = process.env.redirectUrl;
//                 // Trang thank you
//                 var ipnUrl = process.env.ipnUrl
//                 // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
//                 var amount =  product.final_price + product.shipping_fee
//                 // var requestType = "payWithATM";
//                 // show cái thông tin thẻ, cái dưới quét mã, cái trên điền form
//                 var requestType = "captureWallet";
//                 var extraData = "hello"; //pass empty value if your merchant does not have stores
//
//                 // var rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
//                 //     `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
//                 //     `&requestId=${requestId}&requestType=${requestType}`;
//                 var rawSignature = "accessKey="+accessKey+"&amount=" + amount+"&extraData=" + extraData+"&ipnUrl=" + ipnUrl+"&orderId=" + orderId+"&orderInfo=" + orderInfo+"&partnerCode=" + partnerCode +"&redirectUrl=" + redirectUrl+"&requestId=" + requestId+"&requestType=" + requestType
//
//                 var signature = crypto
//                     .createHmac('sha256',secretKey)
//                     .update(rawSignature)
//                     .digest("hex")
//
//                 const requestBody = JSON.stringify({
//                     partnerCode: partnerCode,
//                     accessKey: accessKey,
//                     requestId: requestId,
//                     amount: amount,
//                     orderId: orderId,
//                     orderInfo: orderInfo,
//                     redirectUrl: redirectUrl,
//                     ipnUrl: ipnUrl,
//                     extraData: extraData,
//                     requestType: requestType,
//                     signature: signature,
//                     lang: "vi",
//                 })
//
//                 const https = require("https");
//                 const options = {
//                     hostname: "test-payment.momo.vn",
//                     port: 443,
//                     path: "/v2/gateway/api/create",
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         "Content-Length": Buffer.byteLength(requestBody),
//                     },
//                 };
//                 const reqq = https.request(options, resMom => {
//                     var url =''
//                     var rsCode
//                     console.log(`Status: ${resMom.statusCode}`);
//                     // console.log(`Headers: ${JSON.stringify(resMom.headers)}`);
//                     resMom.setEncoding("utf8");
//                     // trả về body là khi mình call momo
//                     resMom.on("data", (body) => {
//                         let parsedBody = JSON.parse(body)
//                         url += parsedBody.payUrl
//                         rsCode = parsedBody.resultCode
//                         // resultCode = parsedBody.resultCode
//                         // url dẫn đến tranh toán của momo
//                         console.log(parsedBody)
//                         // res.json({ payUrl: url, rsCode: rsCode });
//                     });
//                     resMom.on("end",  async () => {
//                         if(rsCode === 0){
//                             const delivery = new Delivery({
//                                 name: req.body.name,
//                                 payment_method: "Momo",
//                                 address: req.body.address,
//                                 phone: req.body.phone,
//                                 status: 5,
//                                 _id: new mongoose.Types.ObjectId(req.body.product_id)
//                             })
//                             const newDlv = await delivery.save()
//                             delete newDlv._id
//                             const product = await Product.findOneAndUpdate(
//                                 {
//                                     _id: new mongoose.Types.ObjectId(req.body.product_id),
//                                     winner_id: new mongoose.Types.ObjectId(userId)
//                                 },
//                                 {product_delivery: newDlv, status: 5, isDeliInfor:1},
//                                 {new: true}
//                             )
//
//                         }
//                         res.json({message: 'Thành công', payUrl: url});
//                         console.log("No more data in response.update xong");
//                     });
//                 });
//
//                 reqq.on("error", (e) => {
//                     console.log(`problem with request: ${e.message}`);
//                     return res.status(500).json({ error: 'Internal Server Error' });
//                 })
//                 console.log("Sending....");
//                 reqq.write(requestBody);
//                 reqq.end();
//             }
//
//             else if(req.body?.payment_method === 2){
//                 const config = {
//                     appid: process.env.appid,
//                     key1: process.env.key1,
//                     key2: process.env.key2,
//                     endpoint: process.env.endpoint,
//                 };
//                 const embeddata = {
//                     "promotioninfo":"","merchantinfo":"embeddata123",
//                     "redirecturl": process.env.redirectUrl
//                 };
//
//                 const order = {
//                     appid: config.appid,
//                     apptransid: `${moment().format('YYMMDD')}_${uuid()}`, // mã giao dich có định dạng yyMMdd_xxxx
//                     appuser: "demo",
//                     apptime: Date.now(), // miliseconds
//                     item: "[]",
//                     embeddata: JSON.stringify(embeddata),
//                     amount: product.final_price + product.shipping_fee,
//                     description: `Auction - Thanh toán cho sản phẩm ${product.product_name}`,
//                     bankcode:"zalopayapp",
//                 };
//
//                 const data = config.appid + "|" + order.apptransid + "|" + order.appuser + "|" + order.amount + "|" + order.apptime + "|" + order.embeddata + "|" + order.item;
//                 order.mac = CryptoJS.HmacSHA256(data, config.key1,data).toString();
//
//                 var returnUrl = ''
//                 var returncode = 0
//                  await axios.post(config.endpoint, null, { params: order })
//                     .then(res => {
//                         console.log(res.data);
//                         returnUrl += res.data.orderurl
//                        returncode +=res.data.returncode
//                     })
//                     .catch(err => console.log(err));
//
//                 if(returncode === 1){
//                     const delivery = new Delivery({
//                         name: req.body.name,
//                         payment_method: "Zalopay",
//                         address: req.body.address,
//                         phone: req.body.phone,
//                         status: 5,
//                         _id: new mongoose.Types.ObjectId(req.body.product_id)
//                     })
//
//                     const newDlv = await delivery.save()
//                     delete newDlv._id
//
//                     const product1 = await Product.findOneAndUpdate(
//                         {
//                             _id: new mongoose.Types.ObjectId(req.body.product_id),
//                             winner_id: new mongoose.Types.ObjectId(userId)
//                         },{
//                             $set: {
//                                 product_delivery: newDlv,
//                                 status: 5,
//                                 isDeliInfor:1
//                             },
//                         },{new: true}
//                     )
//                 }
//                 res.status(200).json({message: 'Thành công', payUrl: returnUrl});
//             }
//         }
//     } catch (err) {
//         return res.status(500).json({message: 'DATABASE_ERROR', err})
//     }
// }

exports.getTopSeller = async (req, res) => {
    try {
        const userWithMaxProductDoneCount = await User.findOne({
            roles:  { $eq: new mongoose.Types.ObjectId(process.env.userid) }
        }).sort({ product_done_count: -1 })
            .select('product_done_count');

        const maxProductDoneCount = userWithMaxProductDoneCount.product_done_count;

        const users = await User.aggregate([
            {
                $match: {
                    average_rating: { $gt : 0 },
                    roles: { $elemMatch: { $eq: new mongoose.Types.ObjectId(process.env.userid) } }
                }
            },
            {
                $addFields: {
                    total_score: {
                        $add: [
                            { $divide: [ { $multiply: ['$average_rating',2, '$rate_count'] }, '$product_done_count'] },
                            { $multiply: [ { $divide: ['$product_done_count', maxProductDoneCount] }, 10 ] }
                        ]
                    }
                }
            },
            {
                $sort: { total_score: -1 }
            },
            {
                $limit: 6
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    completed_orders: 1,
                    name: 1,
                    product_done_count: 1,
                    average_rating: 1,
                    total_score: 1
                }
            }
        ]);

        res.status(200).json( users)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProduct1k = async (req, res) => {
    try {
        const products = await Auction.find({
            reserve_price: { $lte: 10000 },
            status: 3,
            auction_live: 0,
            finish_time: { $gt: new Date(), $exists: true }
        })
            .limit(10)
            .sort({ reserve_price: 1 })
            .populate('product_id', 'product_name  main_image')
            .select('_id reserve_price');

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getRareProduct = async (req, res) => {
    try {
        const products = await Auction.find({
            status: 3,
            auction_live: 0,
            finish_time: { $gt: new Date(), $exists: true }
        })
            .limit(10)
            .sort({ reserve_price: -1 })
            .populate('product_id', 'product_name  main_image')
            .select('_id reserve_price final_price');

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getStandoutProduct = async (req, res) => {
    try {
        const products = await Auction.find({
            status: 3,
            finish_time: { $gt: new Date(), $exists: true },
            auction_live : { $nin: [1, 2] }
        })
            .limit(7)
            .sort({ view: -1 })
            .populate('product_id', 'product_name  main_image')
            .select('_id reserve_price final_price');

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getRealtimeProduct = async (req, res) => {
    try {
        const  type  = reqConvertType(req.body?.type)
        const  { category,keyword } = req.body.query
        let query = {
            auction_live: 1,
            type_of_auction : {$in : type},
            finish_time: {$gt: new Date(), $exists: true},
            status : 3
        }

        if(keyword){
            query.auction_name = { $regex: keyword, $options: 'i' }
        }
        let cateIds
        if (category && category !== '0'){
            const categories = await Categories.find({
                parent: new mongoose.Types.ObjectId(category)
            }).select('_id')
            cateIds = categories.map(cate => cate._id);
            query.category_id = {$in : cateIds}
        }
        const page = parseInt(req.body.query.page) - 1 || 0

        const limit = 10
        const products = await Auction
            .find(query)
            .skip(page*limit)
            .limit(limit)
            .select('_id finish_time type_of_auction')
            .populate('product_id','product_name main_image')

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products
        }

        res.status(200).json(response)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getStreamProduct = async (req, res) => {
    try {
        const  type  = reqConvertType(req.body?.type)
        const  { category } = req.body.query
        const userId = req.userId
        let query = {
            auction_live: 2,
            type_of_auction : {$in : type},
            register_finish: {$gt: new Date(), $exists: true},
            register_start: {$lt: new Date(), $exists: true},
        }
        let cateIds
        if (category && category !== '0'){
            const categories = await Categories.find({
                parent: new mongoose.Types.ObjectId(category)
            }).select('_id')
            cateIds = categories.map(cate => cate._id);
            query.category_id = {$in : cateIds}
        }
        const page = parseInt(req.body.query.page) - 1 || 0

        const limit = 10
        const products = await Auction
            .find(query)
            .skip(page*limit)
            .limit(limit)
            .select('_id register_finish')
            .populate('product_id','product_name main_image')

        // mảng id các sp
        const productIds = products.map(product => product._id);

        const registerProducts = await Registration.find({
            user_id: new mongoose.Types.ObjectId(userId),
            auction_id: {$in : productIds}
        })

        const result = products.map(product => {
            const registerItem = registerProducts.find((item) => item.auction_id.toString() === product._id.toString());

            return {
                ...product.toObject(),
                register: !!registerItem
            };
        });

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products : result
        }

        res.status(200).json(response)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProductPrepareEnd = async (req, res) => {
    try {

        const products = await Auction.find({
            status: 3,
            auction_live: 0,
            finish_time: { $lt : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
        })
            .limit(10)
            .sort({ finish_time: 1 })
            .populate('product_id', 'product_name  main_image')
            .select('_id reserve_price final_price finish_time');

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getCategories = async (req, res) => {
    try {
        const categories = await Categories.find({
            status : 1 ,
        })

        let parentCategories = categories.filter(category => !category.parent);

        let result = parentCategories.map(parent => ({
            ...parent._doc,
                children: []
        }))

        result.forEach(parentCategory => {
            parentCategory.children = categories.filter(category => category.parent && category.parent.toString() === parentCategory._id.toString());
        });

        res.status(200).json(result)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getCategoryDetail = async (req, res) => {
    try {
        const id = req.params.id
        const category = await Categories.findById(id).select('_id  name')

        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục sản phẩm.' })
        }
        let rs = {...category._doc , children: [] }

        rs.children = await Categories.find(
            {
                parent : category._id
            }
        )

        res.status(200).json(rs)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.getProductsByFilter = async (req, res) => {
    try {
        const id = req.params.id

        const category = await Categories.findById(id).select('_id  name')

        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục sản phẩm.' })
        }

        const childs = await Categories.find({
            parent : new mongoose.Types.ObjectId(category._id)
        })

        let query = {
            auction_live : 0
        };
        let sort = {}

        //price
        const {minPrice , maxPrice } = req.query

        if(minPrice && maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { $and: [{ final_price: { $gt: parseInt(minPrice) } }, { final_price: { $lt: parseInt(maxPrice) } }] }] },
                { $and: [{ final_price: { $exists: false } }, { $and: [{ reserve_price: { $gt: parseInt(minPrice) } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }] },
            ]
        }else if(minPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $gt: parseInt(minPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $gt: parseInt(minPrice) } }] }
            ]
        }else if(maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $lt: parseInt(maxPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }
            ]
        }

        //cate con
        if (req.query.subcate) {
            query.category_id = new mongoose.Types.ObjectId(req.query.subcate)
        }else {
            const childs = await Categories.find({
                parent : new mongoose.Types.ObjectId(category._id)
            })
            query.category_id = { $in: childs.map(child => child._id)}
        }

        // lọc nâng cao
        if (req.query.advance) {
            if (Array.isArray(req.query.advance)) {
                req.query.advance.map((item) => {
                    parseAdvance(item,query)
                });
            } else {
                parseAdvance(req.query.advance,query)
            }
        }
        // lọc sao user
        if (req.query.rate) {
            let users
            if(parseInt(req.query.rate) === -1){
                users = await User.find({
                    average_rating :  {$lt : 1}
                }).select('_id')
            }else {
                users = await User.find({
                    average_rating : {$gt : parseInt(req.query.rate)}
                }).select('_id')
            }
            if(users){
                query.seller_id = { $in: users.map(user => user._id)}
            }
        }

        // trạng thái đã sd hay chưa
        if (req.query.state) {
            if (!Array.isArray(req.query.state)) {
                const products = await Product.find({ is_used: parseInt(req.query.state) }, '_id');
                const productIds = products.map(product => product._id);
                if(productIds.length > 0 ){
                    query.product_id = { $in: productIds };
                }
            }
        }

        if (req.query.sortBy) {
            const parts = splitString(req.query.sortBy)
            if(parts[0] !== 'bid_count'){
                sort[parts[0]] = parts[1]
            }else {
                sort['bids'] = parts[1]
            }
        }

        const page = parseInt(req.query.page) - 1 || 0
        const limit = 15

        query.status = 3
        if(query.start_time){
            query.start_time.$lt = new Date(Date.now());
        }else {
            query.start_time = {
                $lt: new Date(Date.now())
            };
        }
        if(query.finish_time){
            query.finish_time.$gt = new Date(Date.now());
        }else {
            query.finish_time = {
                $gt: new Date(Date.now())
            };
        }

        const products = await Auction.find(query)
            .sort(sort)
            .skip(page*limit)
            .limit(limit)
            .populate('product_id','product_name main_image')

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        if (products.length !== 0) {
            for (let i = 0; i < products.length; i++) {
                // const count = await Bid.aggregate([
                //     {$match: {auction_id: products[i]._id}},
                //     {$group: {_id: "$auction_id", count: {$sum: 1}}}
                // ])
                const count = products[i].bids.length
                if (count > 0) {
                    products[i] = {...products[i]._doc, count : count}
                } else {
                    products[i] = {...products[i]._doc, count: 0}
                }
            }
        }

        // if(sort.bid_count){
        //     if(sort.bid_count === 1){
        //         products.sort((a, b) => a.count - b.count);
        //     }else
        //     products.sort((a, b) => b.count - a.count);
        // }
        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products
        }
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}


exports.getSearchProducts = async (req, res) => {
    try {
        let query = {
            auction_live : 0
        };
        let sort = {}

        const {keyword } = req.query
        if(keyword){
            query.auction_name = { $regex: keyword, $options: 'i' }
        }

        //price
        const {minPrice , maxPrice } = req.query
        if(minPrice && maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { $and: [{ final_price: { $gt: parseInt(minPrice) } }, { final_price: { $lt: parseInt(maxPrice) } }] }] },
                { $and: [{ final_price: { $exists: false } }, { $and: [{ reserve_price: { $gt: parseInt(minPrice) } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }] },
            ]
        }else if(minPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $gt: parseInt(minPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $gt: parseInt(minPrice) } }] }
            ]
        }else if(maxPrice){
            query.$or = [
                { $and: [{ final_price: { $exists: true } }, { final_price: { $lt: parseInt(maxPrice) } }] },
                { $and: [{ final_price: { $exists: false } }, { reserve_price: { $lt: parseInt(maxPrice) } }] }
            ]
        }

        // //cate con
        // if (req.query.subcate) {
        //     query.category_id = new mongoose.Types.ObjectId(req.query.subcate)
        // }else {
        //     const childs = await Categories.find({
        //         parent : new mongoose.Types.ObjectId(category._id)
        //     })
        //     query.category_id = { $in: childs.map(child => child._id)}
        // }

        // lọc nâng cao
        if (req.query.advance) {
            if (Array.isArray(req.query.advance)) {
                req.query.advance.map((item) => {
                    parseAdvance(item,query)
                });
            } else {
                parseAdvance(req.query.advance,query)
            }
        }

        // lọc sao user
        if (req.query.rate) {
            let users
            if(parseInt(req.query.rate) === -1){
                users = await User.find({
                    average_rating :  {$lt : 1}
                }).select('_id')
            }else {
                users = await User.find({
                    average_rating : {$gt : parseInt(req.query.rate)}
                }).select('_id')
            }
            if(users){
                query.seller_id = { $in: users.map(user => user._id)}
            }
        }

        // trạng thái đã sd hay chưa
        if (req.query.state) {
            if (!Array.isArray(req.query.state)) {
                const products = await Product.find({ is_used: parseInt(req.query.state) }, '_id');
                const productIds = products.map(product => product._id);
                if(productIds.length > 0 ){
                    query.product_id = { $in: productIds };
                }
            }
        }

        if (req.query.sortBy) {
            const parts = splitString(req.query.sortBy)
            if(parts[0] !== 'bid_count'){
                sort[parts[0]] = parts[1]
            }else {
                sort['bids'] = parts[1]
            }
        }

        const page = parseInt(req.query.page) - 1 || 0
        const limit = 15

        query.status = 3
        if(query.start_time){
            query.start_time.$lt = new Date(Date.now());
        }else {
            query.start_time = {
                $lt: new Date(Date.now())
            };
        }
        if(query.finish_time){
            query.finish_time.$gt = new Date(Date.now());
        }else {
            query.finish_time = {
                $gt: new Date(Date.now())
            };
        }

        const products = await Auction.find(query)
            .sort(sort)
            .skip(page*limit)
            .limit(limit)
            .populate('product_id','product_name main_image')

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        if (products.length !== 0) {
            for (let i = 0; i < products.length; i++) {
                const count = products[i].bids.length
                if (count > 0) {
                    products[i] = {...products[i]._doc, count : count}
                } else {
                    products[i] = {...products[i]._doc, count: 0}
                }
            }
        }

        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products
        }
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.getRalatedProduct = async (req, res) => {
    try {
        const id = req.params.id
        const product = await Auction.findById(id).select('_id category_id ')

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm đấu giá.' })
        }

        const relatedProducts = await Auction.find({
            status: 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
            category_id: product.category_id,
            _id : {$ne : product._id}
        }).select('_id finish_time final_price reserve_price category_id')
            .populate('product_id','main_image product_name')

        res.status(200).json(relatedProducts)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}


// api cho 1 lần trả giá online
exports.createRealtimeBid = async (req, res) => {
    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)
        const bid_price = req.body?.final_price

        initAuctionSocket(productId);
        const auctionNamespace = activeAuctions[productId].namespace;

        if(bid_price <= 0){
            return res.status(404).json({message: 'Giá đưa ra không hợp lệ'})
        }
        const product = await Auction.findOne({
                _id: new mongoose.Types.ObjectId(productId),
                status: 3,
                auction_live: 1,
                seller_id: {$ne : winner_id},
                start_time: {$lt: new Date()},
                finish_time: {$gt: new Date()},
            }).populate('bids')

        if (!product) {
            return res.status(404).json({message: 'Không đủ điều kiện tham gia đấu giá '})
        }
        let {point , auction_deposit} = await User.findOne({
            _id : winner_id,
        }).select('point auction_deposit')

        if(!checkByAuctionDeposit(auction_deposit , product.reserve_price)){
            if(!canBidByPoint(point, product.reserve_price)){
                return res.status(404).json({message: `Cần thêm ${getMinimumPoints(product.reserve_price) - point} điểm lũy. Đăng ký mức cọc phù hợp để tham gia đấu giá nhé! `})
            }
        }

        if(product.type_of_auction === 1 && product.bids.length !== 0){
            if(product.bids[product.bids.length - 1].bid_price >= bid_price){
                return res.status(404).json({message: 'Giá đưa ra không hợp lệ'})
            }
        }else if(product.type_of_auction === -1 && product.bids.length !== 0){
            if(product.bids[product.bids.length - 1].bid_price <= bid_price){
                return res.status(404).json({message: 'Giá đưa ra không hợp lệ'})
            }
        }
        const bid = new Bid({
            auction_id: new mongoose.Types.ObjectId(productId),
            username: username,
            bid_price: bid_price,
            bid_time: new Date(),
        })

        if(bid){
            product.bids.push(bid._id)
        }
        await Promise.all([product.save(), bid.save()]);

        const new_bid = {
            id: bid._id,
            bid_price: bid.bid_price,
            username: bid.username,
            bid_time: bid.bid_time,
        }
        auctionNamespace.emit(`auction`, new_bid)

        res.status(200).json({message: 'Thực hiện trả giá thành công', new_bid})
    } catch (err) {
        return res.status(500).json({message: 'Không đủ điều kiện tham gia đấu giá', err})
    }
}

exports.PriceDownRealtimeBuy = async (req, res) => {
    const result = await BuyProductAuctionPriceDown(req);
        res.status(result.statusCode).json(result);
        if (!result.error) {
            const data1 = {
                winner: result.data.winner_id.toString(),
                final_price: result?.data?.final_price,
                url: '/',
            };

            const data = new Notification ( {
                title : 'Đấu giá thành công',
                content : `Bạn vừa đấu giá thành công sản phẩm #${result.data._id.toString()}`,
                url :`winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`,
                type : 1,
                receiver : [result.data.winner_id],
            })
            await data.save()
            sse.send(data1, `finishAuctionOnline_${result.data._id}`);
            sse.send( data, `buySuccess_${result.data.winner_id.toString()}`);
            const user = await User.findOne({
                _id : new mongoose.Types.ObjectId(result.data.winner_id)
            })
            let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=4`
            if(user.receiveAuctionSuccessEmail){
                await sendEmailAuctionSuccess({ email: user.email , productName : result.data?.auction_name , url, price : result.data.final_price , deadline : formatDateTime(result.data.delivery.procedure_complete_time)  })
            }
        }
}

exports.createStreamBid = async (req, res) => {
    try {
        const userId = req.userId
        const username = req.username
        const winner_id = new mongoose.Types.ObjectId(userId)

        const { productId, accessCode}  = req.body
        const bid_price = req.body?.final_price

        if(!productId || !accessCode){
            return res.status(404).json({message: 'Không đủ điều kiện trả giá sản phẩm !'})
        }

        initAuctionSocket(productId);
        const auctionNamespace = activeAuctions[productId].namespace;

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            auction_live: 2,
            seller_id: {$ne : winner_id},
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
        }).populate('bids min_price')

        if (!product) {
            return res.status(404).json({message: 'Không đủ điều kiện tham gia đấu giá '})
        }
        const checkAccessCode = await Registration.findOne({
            user_id : new mongoose.Types.ObjectId(userId),
            auction_id :new mongoose.Types.ObjectId(productId),
            code_access : accessCode
        })

        if(!checkAccessCode){
            return res.status(404).json({message: 'Mã truy cập không hợp lệ. Tài khoản có thể đang được đăng nhập ở nơi khác!'})
        }

        if(product.type_of_auction === 1 && product.bids.length !== 0){
            if(product.bids[product.bids.length - 1].bid_price >= bid_price){
                return res.status(404).json({message: 'Giá đưa ra không hợp lệ'})
            }
        }else if(product.type_of_auction === -1 && product.bids.length !== 0){
            if(product.bids[product.bids.length - 1].bid_price <= bid_price || bid_price < product.min_price ){
                return res.status(404).json({message: 'Giá đưa ra không hợp lệ'})
            }
        }

        const bid = new Bid({
            auction_id: new mongoose.Types.ObjectId(productId),
            username: username,
            bid_price: bid_price,
            bid_time: new Date(),
        })

        if(bid){
            product.bids.push(bid._id)
        }
        await Promise.all([product.save(), bid.save()]);

        const new_bid = {
            id: bid._id,
            bid_price: bid.bid_price,
            username: bid.username,
            bid_time: bid.bid_time,
        }
        auctionNamespace.emit(`auction`, new_bid)

        res.status(200).json({message: 'Thực hiện trả giá thành công', new_bid})
    } catch (err) {
        return res.status(500).json({message: 'Không đủ điều kiện tham gia đấu giá', err})
    }
}

exports.getTopBidOfProduct = async (req, res) => {
    try {
        const productId = req.params.product_id

        initAuctionSocket(productId);
        const auctionNamespace = activeAuctions[productId].namespace;
        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()}}
        ).select('step_price reserve_price finish_time type_of_auction')
            .populate('product_id','main_image')
            .lean()
        // lấy type của sản phẩm để get top bit . sort sẽ = 1 or -1 tùy type

        const topBidList = await Bid.aggregate([
            {
                $match: {auction_id: new mongoose.Types.ObjectId(productId)}
            },
            {
                $sort: {createdAt: -1}
            },
            {
                $limit: 3
            }
        ])

        const highest_price = topBidList.length === 0 ? product.reserve_price : topBidList[0].bid_price
        return res.status(200).json({list : topBidList, product , highest_price, type_of_auction : product.type_of_auction })
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR 1', err})
    }
}

exports.getTopBidStream = async (req, res) => {
    try {
        const userId = req.userId
        const {accessCode ,id: auctionId } = req.body

        initAuctionSocket(auctionId);
        const auctionNamespace = activeAuctions[auctionId].namespace;
        const checkRegis = await Registration.findOne({
            user_id : new mongoose.Types.ObjectId(userId),
            auction_id: new mongoose.Types.ObjectId(auctionId),
            code_access:accessCode
        })
        if (!checkRegis){
            return res.status(404).json({message: 'Mật khẩu không chính xác. Không có quyền truy cập phiên đấu giá này'})
        }

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(auctionId),
            status: 3,
        }).select('step_price url_stream min_price room_id reserve_price shipping_fee finish_time type_of_auction')
            .populate('product_id')
            .lean()

        const topBidList = await Bid.aggregate([
            {
                $match: {auction_id: new mongoose.Types.ObjectId(auctionId)}
            },
            {
                $sort: {createdAt: -1}
            },
            {
                $limit: 3
            }
        ])


        const highest_price = topBidList.length === 0 ? product.reserve_price : topBidList[0].bid_price
        return res.status(200).json({list : topBidList, product , highest_price, type_of_auction : product.type_of_auction })
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR 1', err})
    }
}

exports.getCheckOutDeposit = async (req, res) => {
    try {
        const id = req.params.id
        const username = req.username
        const userId = req.userId
        let product = await Auction.findOne({
            _id : new mongoose.Types.ObjectId(id),
            auction_live: 2,
            register_finish : {$gt : new Date()},
            register_start : {$lt : new Date()}
        })
            .select('_id deposit_price auction_name')

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' })
        }
        const registration = await Registration.findOne({
            user_id: new mongoose.Types.ObjectId(userId),
            auction_id : new mongoose.Types.ObjectId(id),
        })
        if(registration){
            return res.status(404).json({ message: 'You was Registered.' })
        }
        const content = `${username}-${product._id}`
        res.status(200).json({...product._doc,content})
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.getConfirmDeposit = async (req, res) => {
    try {
        const productId = req.params.id
        const userId = req.userId
        let registration
        const product = await Auction.findOne(
            {
                _id: new mongoose.Types.ObjectId(productId),
                auction_live: 2,
            },
            'code_access deposit_price'
        ).populate('product_id','product_name rank is_used main_image')

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' })
        }

        if(product?.code_access){
            registration = await Registration.findOne({
                user_id : new mongoose.Types.ObjectId(userId),
                _id : { $in : product.code_access}
            }).select('_id payment_method')
        }
        if(!registration){
            return res.status(404).json({ message: 'Not registration.' })
        }

        res.status(200).json({...product._doc,registration})
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.checkoutDeposit = async (req, res) => {
    try {
        const userId = req.userId

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(req.body.product_id),
            auction_live: 2
        }).populate('product_id')

        const registration = await Registration.findOne({
            user_id: new mongoose.Types.ObjectId(userId),
            auction_id : new mongoose.Types.ObjectId(req.body.product_id),
        })
        if(registration){
            return res.status(404).json({ message: 'You was Registered.' })
        }

        const user = await User.findById({
            _id: userId
        })

        if (product?.auction_live === 2) {
            //  bằng 1 : momo , bằng 2 : zalopay
            if(req.body?.payment_method === 1){

                var partnerCode = "MOMO"
                // var accessKey = process.env.accessKey;
                // var secretkey = process.env.
                var accessKey = 'F8BBA842ECF85';
                var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
                // chuỗi ngẫu nhiên để phân biệt cái request
                var requestId = partnerCode + new Date().getTime() + "id";
                // mã đặt đơn
                var orderId = new Date().getTime() + ":0123456778";
                //
                var orderInfo = "Thanh toán sản phẩm "+ product?.product_id?.product_name;
                // cung cấp họ về một cái pages sau khi thanh toán sẽ trở về trang nớ
                var redirectUrl = `${process.env.SERVER}confirm/${product._id}`
                    // process.env.redirectUrlDeposit;
                // Trang thank you
                var ipnUrl = process.env.ipnUrl
                // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
                var amount =  product.deposit_price
                // var requestType = "payWithATM";
                // show cái thông tin thẻ, cái dưới quét mã, cái trên điền form
                var requestType = "captureWallet";
                var extraData = "hello"; //pass empty value if your merchant does not have stores

                // var rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
                //     `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
                //     `&requestId=${requestId}&requestType=${requestType}`;
                var rawSignature = "accessKey="+accessKey+"&amount=" + amount+"&extraData=" + extraData+"&ipnUrl=" + ipnUrl+"&orderId=" + orderId+"&orderInfo=" + orderInfo+"&partnerCode=" + partnerCode +"&redirectUrl=" + redirectUrl+"&requestId=" + requestId+"&requestType=" + requestType

                var signature = crypto
                    .createHmac('sha256',secretKey)
                    .update(rawSignature)
                    .digest("hex")

                const requestBody = JSON.stringify({
                    partnerCode: partnerCode,
                    accessKey: accessKey,
                    requestId: requestId,
                    amount: amount,
                    orderId: orderId,
                    orderInfo: orderInfo,
                    redirectUrl: redirectUrl,
                    ipnUrl: ipnUrl,
                    extraData: extraData,
                    requestType: requestType,
                    signature: signature,
                    lang: "vi",
                })

                const https = require("https");
                const options = {
                    hostname: "test-payment.momo.vn",
                    port: 443,
                    path: "/v2/gateway/api/create",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(requestBody),
                    },
                };
                const reqq = https.request(options, resMom => {
                    var url =''
                    var rsCode
                    console.log(`Status: ${resMom.statusCode}`);
                    // console.log(`Headers: ${JSON.stringify(resMom.headers)}`);
                    resMom.setEncoding("utf8");
                    // trả về body là khi mình call momo
                    resMom.on("data", (body) => {
                        let parsedBody = JSON.parse(body)
                        url += parsedBody.payUrl
                        rsCode = parsedBody.resultCode
                        // resultCode = parsedBody.resultCode
                        // url dẫn đến tranh toán của momo
                        console.log(parsedBody)
                        // res.json({ payUrl: url, rsCode: rsCode });
                    });
                    resMom.on("end",  async () => {
                        if(rsCode === 0){
                            const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8)
                            const randomCode = nanoid()

                            const registration = new Registration({
                                user_id: new mongoose.Types.ObjectId(userId),
                                auction_id : product._id,
                                payment_method: 1,
                                code : randomCode,
                            })

                            if(registration){
                                product.code_access.push(registration._id);
                            }
                            await Promise.all([product.save(), registration.save()]);

                            if(registration){
                                await sendEmail({ email: user.email ,room : product?.room_id, productName : product?.product_id?.product_name, randomCode, startTime : formatDateTime(product.start_time) })
                            }
                        }
                        res.json({message: 'Thành công', payUrl: url});
                        console.log("No more data in response.update xong");
                    });
                });
                reqq.on("error", (e) => {
                    console.log(`problem with request: ${e.message}`);
                    return res.status(500).json({ error: 'Internal Server Error' });
                })
                console.log("Sending....");
                reqq.write(requestBody);
                reqq.end();
            }
            else if(req.body?.payment_method === 2){
                const config = {
                    app_id: process.env.app_id,
                    key1: process.env.key1_new,
                    key2: process.env.key2_new,
                    endpoint: process.env.endpoint_new,
                };
                const embed_data = { "redirecturl": `${process.env.SERVER}confirm/${product._id}`};
                const items = [{}];
                const transID = Math.floor(Math.random() * 1000000);
                const order = {
                    app_id: config.app_id,
                    app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
                    app_user: "user123",
                    app_time: Date.now(),
                    item: JSON.stringify(items),
                    embed_data: JSON.stringify(embed_data),
                    amount:product.deposit_price,
                    description: `Auction - Thanh toán đăng ký đấu giá sản phẩm  ${product?.product_id?.product_name}`,
                    bank_code: "zalopayapp",
                };

                const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
                order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
                var returnUrl = ''
                var returncode = 0
                await axios.post(config.endpoint, null, { params: order })
                    .then(res => {
                        console.log(res.data);
                        returnUrl += res.data.order_url
                        returncode +=res.data.return_code
                    })
                    .catch(err => console.log(err));

                if(returncode === 1){
                    const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8)
                    const randomCode = nanoid()

                    const registration = new Registration({
                        user_id: new mongoose.Types.ObjectId(userId),
                        auction_id : product._id,
                        payment_method: 2,
                        code : randomCode,
                    })

                    if(registration){
                        product.code_access.push(registration._id);
                    }
                    await Promise.all([product.save(), registration.save()]);

                    if(registration){
                        await sendEmail({ email: user.email ,room :product?.room_id, productName : product?.product_id?.product_name, randomCode, startTime : formatDateTime(product.start_time) })
                    }
                }
                res.status(200).json({message: 'Thành công', payUrl: returnUrl});
            }
        }
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.checkoutPackageRegistration = async (req, res) => {
    try {
        const userId = req.userId
        const {payment_method} = req.body
        const data1 = req.body.data

        if (!data1 || !payment_method){
            return res.status(404).json({ message: 'Vui lòng điền đầy đủ thông tin.' })
        }

        const user = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId),
        }).populate('auction_deposit')

        const {auction_deposit} = user
        if (auction_deposit){
            return res.status(404).json({ message: 'Bạn đã đăng ký mức cọc đấu giá rồi.' })
        }
        if (!checkPackageRegis(data1.level, data1.deposit)){
            return res.status(404).json({ message: 'Không tồn tại mức đăng ký này.' })
        }

        //  bằng 1 : momo , bằng 2 : zalopay
        if (payment_method === 1) {

            var partnerCode = "MOMO"
            // var accessKey = process.env.accessKey;
            // var secretkey = process.env.
            var accessKey = 'F8BBA842ECF85';
            var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
            // chuỗi ngẫu nhiên để phân biệt cái request
            var requestId = partnerCode + new Date().getTime() + "id";
            // mã đặt đơn
            var orderId = new Date().getTime() + ":0123456778";
            //
            var orderInfo = "Thanh toán phí đăng ký cọc đấu giá mức" + data1.level;
            // cung cấp họ về một cái pages sau khi thanh toán sẽ trở về trang nớ
            var redirectUrl = `${process.env.SERVER}confirmRegistration`
            // process.env.redirectUrlDeposit;
            // Trang thank you
            var ipnUrl = process.env.ipnUrl
            // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
            var amount = data1.deposit * 1000
            // var requestType = "payWithATM";
            // show cái thông tin thẻ, cái dưới quét mã, cái trên điền form
            var requestType = "captureWallet";
            var extraData = "hello"; //pass empty value if your merchant does not have stores

            var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl="
                + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl="
                + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType

            var signature = crypto
                .createHmac('sha256', secretKey)
                .update(rawSignature)
                .digest("hex")

            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                accessKey: accessKey,
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                extraData: extraData,
                requestType: requestType,
                signature: signature,
                lang: "vi",
            })

            const https = require("https");
            const options = {
                hostname: "test-payment.momo.vn",
                port: 443,
                path: "/v2/gateway/api/create",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(requestBody),
                },
            };
            const reqq = https.request(options, resMom => {
                var url = ''
                var rsCode
                console.log(`Status: ${resMom.statusCode}`);
                resMom.setEncoding("utf8");
                // trả về body là khi mình call momo
                resMom.on("data", (body) => {
                    let parsedBody = JSON.parse(body)
                    url += parsedBody.payUrl
                    rsCode = parsedBody.resultCode
                    // resultCode = parsedBody.resultCode
                    // url dẫn đến tranh toán của momo
                    // res.json({ payUrl: url, rsCode: rsCode });
                });
                resMom.on("end", async () => {
                    if (rsCode === 0) {
                        user.auction_deposit = data1.deposit
                        await user.save()
                    }
                    res.json({message: 'Thành công', payUrl: url});
                    console.log("No more data in response.update xong");
                });
            });
            reqq.on("error", (e) => {
                console.log(`problem with request: ${e.message}`);
                return res.status(500).json({error: 'Internal Server Error'});
            })
            console.log("Sending....");
            reqq.write(requestBody);
            reqq.end();
        }
            else if(payment_method === 2){
                const config = {
                    app_id: process.env.app_id,
                    key1: process.env.key1_new,
                    key2: process.env.key2_new,
                    endpoint: process.env.endpoint_new,
                };

            const embed_data = { "redirecturl": `${process.env.SERVER}confirmRegistration` };
            const items = [{}];
            const transID = Math.floor(Math.random() * 1000000);
            const order = {
                app_id: config.app_id,
                app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
                app_user: "user123",
                app_time: Date.now(),
                item: JSON.stringify(items),
                embed_data: JSON.stringify(embed_data),
                amount: data1.deposit* 1000,
                description: `Auction - Thanh toán đăng ký đấu giá mức `+data1.level,
                bank_code: "zalopayapp",
            };

            const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
            order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
            var returnUrl = ''
            var returncode = 0
            await axios.post(config.endpoint, null, { params: order })
                .then(res => {
                    console.log(res.data);
                    returnUrl += res.data.order_url
                    returncode +=res.data.return_code
                })
                .catch(err => console.log(err));

                if(returncode === 1){
                    user.auction_deposit = data1.deposit
                    await user.save()
                }
                res.status(200).json({message: 'Thành công', payUrl: returnUrl});
            }
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.withdrawPackageRegistration = async (req, res) => {
    try {
        const userId = req.userId
        const {cardNumber, expiration, cvc , cardName} = req.body

        if (!cardNumber || !expiration || !cvc || !cardName){
            return res.status(404).json({ message: 'Vui lòng điền đầy đủ thông tin để nhận hoàn đăng ký.' })
        }
        if (!isValidCardNumber(cardNumber)) {
            return res.status(404).json({ message: 'Số thẻ không hợp lệ. Số thẻ phải là 16 chữ số.' })
        }
        if (!isValidExpiration(expiration)) {
            return res.status(404).json({ message: 'Ngày hết hạn không hợp lệ.' })
        }
        if (!isValidCVC(cvc)) {
            return res.status(404).json({ message: 'Mã CVC không hợp lệ. CVC phải là 3 chữ số.' })
        }
        if (!isValidCardName(cardName)) {
            return res.status(404).json({ message: 'Tên trên thẻ không hợp lệ.' })
        }

        const user = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId),
        }).populate('auction_deposit')

        const {auction_deposit} = user
        if (!auction_deposit){
            return res.status(404).json({ message: 'Bạn chưa đăng ký mức cọc đấu giá nào.' })
        }

        const AucW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gte : 500000},
            status: 4
        })

        const DlvW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gte : 500000},
            status: {$in: [5, 6, 7]}
        })

        const ReW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gte : 500000},
            status: 9
        })

        const count_penR = await Request.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: 1
        })

        const count_appR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: 2
        })

        const count_bidR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: { $in: [3, 4] },
        })

        const count_sucR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: 5
        })

        const count_cfR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: 6
        })

        const count_dlvR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            reserve_price : {$gt : 500000},
            status: 7
        })

        if(AucW || DlvW || ReW || count_penR || count_appR || count_dlvR || count_cfR || count_sucR || count_bidR ){
            return res.status(404).json({ message: 'Bạn chưa hoàn tất các phiên đấu giá hiện tại.' })
        }

        user.auction_deposit = 0
        await user.save()

        return res.status(200).json({ message: 'Yêu cầu hoàn tiền thành công.', returnUrl : `${process.env.SERVER}confirmWithdrawRegistration` })

    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.checkPWStreamRoom = async (req, res) => {
    try {
        const productId = req.body.product_id
        const codeFromUser = req.body.code
        const userId = req.userId

        if(!codeFromUser || !productId){
            return res.status(404).json({message : 'Mật khẩu hoặc sản phẩm không tồn tại!'})
        }

        const checkRegis = await Registration.findOne({
            user_id: new mongoose.Types.ObjectId(userId),
            auction_id: new mongoose.Types.ObjectId(productId),
            code : codeFromUser
        })

        if(!checkRegis){
            return res.status(404).json({message : 'Mật khẩu không chính xác. Bạn hãy thử lại!'})
        }

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            auction_live: 2,
            status: 3,
            start_time: {$lt: new Date()},
        }).select('_id type_of_auction')
        if(!product){
            return res.status(404).json({message : 'Phiên đấu giá chưa bắt đầu !'})
        }

        const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5)
        var accessCode = nanoid()
        checkRegis.code_access = accessCode
        await checkRegis.save()
        let type = product.type_of_auction === 1 ? 'biddingStream' : 'biddingStreamDown'
        const response = {
            status : 200,
            message: 'Xác thực thành công!',
            pathUrl: `${process.env.SERVER}${type}/${product._id.toString()}?accessCode=${accessCode}`,
            error: false
        }
        res.status(200).json(response);
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR',error: true, err})
    }
}
// phòng đấu giá
exports.getStreamAuctionGeneral = async (req, res) => {
    try {
        const  type  = reqConvertType(req.body?.type)
        const  { keyword } = req.body.query

        let query = {
            auction_live: 2,
            status : 3,
            type_of_auction : {$in : type},
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
        }

        if(keyword){
            query.room_id = { $regex: keyword, $options: 'i' }
        }

        const page = parseInt(req.body.query.page) - 1 || 0

        const limit = 15
        const products = await Auction
            .find(query)
            .skip(page*limit)
            .limit(limit)
            .select('_id finish_time room_id')
            .populate('product_id','product_name main_image')

        const total = await Auction.countDocuments(query)

        const totalPage = Math.ceil(total / limit)

        const response = {
            error:false,
            total,
            totalPage,
            currentPage : page + 1,
            products : products
        }

        res.status(200).json(response)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

