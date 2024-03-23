const mongoose = require('mongoose')
const Product = require('../models/product.model')
const Auction = require('../models/auction.model')
const User = require("../models/user.model");
const Delivery = require("../models/delivery.model");
const crypto = require("crypto");
require('dotenv').config()
const axios = require('axios')
const CryptoJS = require('crypto-js'); // npm install crypto-js
const {v1:uuid} = require('uuid'); // npm install uuid
const moment = require('moment');

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
            {
                _id: {$in: products},
                status: 3
            },
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

        if (userId === winner_id) {
            return res.status(404).json({message: 'Không được đấu giả sản phẩm của mình'})
        }
        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status: 3,
                start_time: {$lt: new Date()},
                finish_time: {$gt: new Date()},
                seller_id: {$ne: winner_id},
                $or: [
                    {final_price: {$lt: parseInt(req.body.final_price)}},
                    {final_price: {$exists: false}},
                ],
            },
            {
                $set: {
                    final_price: req.body.final_price,
                    winner_id: winner_id,
                }
            })
        if (!product) {
            return res.status(404).json({message: 'Không đủ điều kiện tham gia đấu giá'})
        } else {
            const bid = new Auction({
                product_id: new mongoose.Types.ObjectId(productId),
                user: new mongoose.Types.ObjectId(userId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            await bid.save();
        }

        res.status(200).json({message: 'Thực hiện trả giá thành công'})
    } catch (err) {
        return res.status(500).json({message: 'Không đủ điều kiện tham gia đấu giá', err})
    }
}

exports.getAuctionProductBidCount = async (req, res) => {
    try {
        const Id = req.params.productId

        const bidCount = await Auction.countDocuments({
            product_id: new mongoose.Types.ObjectId(Id),
        })

        res.status(200).json({bidCount: bidCount})
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
                status: 3,
                start_time: {$lt: new Date()},
                finish_time: {$gt: new Date()},
                seller_id: {$ne: winner_id},
                $or: [
                    {sale_price: parseInt(req.body.final_price)},
                    {final_price: {$exists: false}},
                ],
            },
            [
                {
                    $set: {
                        status: 4,
                        final_price: req.body.final_price,
                        winner_id: winner_id,
                        victory_time: new Date(),
                        isDeliInfor: 0,
                        procedure_complete_time: {$add: ["$finish_time", 2 * 24 * 60 * 60 * 1000]},
                    }
                }]
        )
        if (!product) {
            return res.status(404).json({message: 'Không đủ điều kiện mua sản phẩm'})
        } else {
            const bid = new Auction({
                product_id: new mongoose.Types.ObjectId(productId),
                user: new mongoose.Types.ObjectId(userId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            await bid.save();
        }

        res.status(200).json({message: 'Thực hiện trả giá thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
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
        var products = await Product.find({
            seller_id: new mongoose.Types.ObjectId(user._id),
            status: 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
        })
        if (products.length !== 0) {
            for (let i = 0; i < products.length; i++) {
                const count = await Auction.aggregate([
                    {$match: {product_id: products[i]._id}},
                    {$group: {_id: "$product_id", count: {$sum: 1}}}
                ]);
                if (count.length > 0) {
                    products[i] = {...products[i]._doc, ...count[0]}
                } else {
                    products[i] = {...products[i]._doc, count: 0}
                }

            }
        }

        res.status(200).json({user: user, products: products})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.finishAuctionProduct = async (req, res) => {
    try {
        const productId = req.body.productId

        const product = await Product.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            start_time: {$lt: new Date()},
        })
        if (product.winner_id && product.final_price && product.reserve_price < product.final_price) {
            product.status = 4
            product.victory_time = product.finish_time
            product.isDeliInfor = 0
            product.procedure_complete_time = new Date(product.finish_time).setDate(new Date(product.finish_time).getDate() + 2)
            await product.save()
        }else {
            product.status = 10
            await product.save()
        }
        res.status(200).json({message: 'Cập nhật trạng thái thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.checkoutProduct = async (req, res) => {
    try {
        const userId = req.userId
        const product = await Product.findOne({
            _id: new mongoose.Types.ObjectId(req.body.product_id)
        })
        if (product.status === 4) {
            // = 0 tiền mặt , bằng 1 : momo , bằng 2 : vnpay
            if(req.body?.payment_method === 0){
                const delivery = new Delivery({
                    name: req.body.name,
                    payment_method: "Tiền mặt",
                    address: req.body.address,
                    phone: req.body.phone,
                    status: 5,
                    _id: new mongoose.Types.ObjectId(req.body.product_id)
                })
                const newDlv = await delivery.save()
                delete newDlv._id
                const product = await Product.findOneAndUpdate(
                    {
                        _id: new mongoose.Types.ObjectId(req.body.product_id),
                        winner_id: new mongoose.Types.ObjectId(userId)
                    },
                    {product_delivery: newDlv, status: 5, isDeliInfor:1},
                    {new: true}
                )
                return res.status(200).json({message: 'Thành công',payUrl :process.env.redirectUrl})
            }else if(req.body?.payment_method === 1){
            //     thanh toán momo
                var partnerCode = process.env.partnerCode
                var accessKey = process.env.accessKey;
                var secretkey = process.env.SECRETKEY1
                // chuỗi ngẫu nhiên để phân biệt cái request
                var requestId = partnerCode + new Date().getTime() + "id";
                // mã đặt đơn
                var orderId = new Date().getTime() + ":0123456778";
                //
                var orderInfo = "Thanh toán sản phẩm "+ product.product_name;
                // cung cấp họ về một cái pages sau khi thanh toán sẽ trở về trang nớ
                var redirectUrl = process.env.redirectUrl;
                // Trang thank you
                var ipnUrl = process.env.ipnUrl
                // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
                var amount = product.final_price + product.shipping_fee
                // var requestType = "payWithATM";
                // show cái thông tin thẻ, cái dưới quét mã, cái trên điền form
                var requestType = "captureWallet";
                var extraData = "hello"; //pass empty value if your merchant does not have stores

                var rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
                    `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
                    `&requestId=${requestId}&requestType=${requestType}`;

                var signature = crypto
                    .createHmac('sha256',secretkey)
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
            const reqq = https.request(options, (resMom) => {
                var url =''
                var rsCode
                // console.log(`Headers: ${JSON.stringify(resMom.headers)}`);
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
                resMom.on("end",  async () => {
                    if(rsCode === 0){
                        const delivery = new Delivery({
                            name: req.body.name,
                            payment_method: "Momo",
                            address: req.body.address,
                            phone: req.body.phone,
                            status: 5,
                            _id: new mongoose.Types.ObjectId(req.body.product_id)
                        })
                        const newDlv = await delivery.save()
                        delete newDlv._id
                        const product = await Product.findOneAndUpdate(
                            {
                                _id: new mongoose.Types.ObjectId(req.body.product_id),
                                winner_id: new mongoose.Types.ObjectId(userId)
                            },
                            {product_delivery: newDlv, status: 5, isDeliInfor:1},
                            {new: true}
                        )

                    }
                    res.json({message: 'Thành công', payUrl: url});
                });
            });

            reqq.on("error", (e) => {
                return res.status(500).json({ error: 'Internal Server Error' });
            })

            reqq.write(requestBody);
            reqq.end();
            }

            else if(req.body?.payment_method === 2){
                const config = {
                    appid: process.env.appid,
                    key1: process.env.key1,
                    key2: process.env.key2,
                    endpoint: process.env.endpoint,
                };
                const embeddata = {
                    "promotioninfo":"","merchantinfo":"embeddata123",
                    "redirecturl": process.env.redirectUrl
                };

                const order = {
                    appid: config.appid,
                    apptransid: `${moment().format('YYMMDD')}_${uuid()}`, // mã giao dich có định dạng yyMMdd_xxxx
                    appuser: "demo",
                    apptime: Date.now(), // miliseconds
                    item: "[]",
                    embeddata: JSON.stringify(embeddata),
                    amount: product.final_price + product.shipping_fee,
                    description: `Auction - Thanh toán cho sản phẩm ${product.product_name}`,
                    bankcode:"zalopayapp",
                };

                const data = config.appid + "|" + order.apptransid + "|" + order.appuser + "|" + order.amount + "|" + order.apptime + "|" + order.embeddata + "|" + order.item;
                order.mac = CryptoJS.HmacSHA256(data, config.key1,data).toString();

                var returnUrl = ''
                var returncode = 0
                 await axios.post(config.endpoint, null, { params: order })
                    .then(res => {
                        console.log(res.data);
                        returnUrl += res.data.orderurl
                       returncode +=res.data.returncode
                    })
                    .catch(err => console.log(err));

                if(returncode === 1){
                    const delivery = new Delivery({
                        name: req.body.name,
                        payment_method: "Zalopay",
                        address: req.body.address,
                        phone: req.body.phone,
                        status: 5,
                        _id: new mongoose.Types.ObjectId(req.body.product_id)
                    })

                    const newDlv = await delivery.save()
                    delete newDlv._id

                    const product1 = await Product.findOneAndUpdate(
                        {
                            _id: new mongoose.Types.ObjectId(req.body.product_id),
                            winner_id: new mongoose.Types.ObjectId(userId)
                        },{
                            $set: {
                                product_delivery: newDlv,
                                status: 5,
                                isDeliInfor:1
                            },
                        },{new: true}
                    )
                }
                res.status(200).json({message: 'Thành công', payUrl: returnUrl});
            }
        }
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getTopSeller = async (req, res) => {
    try {
        const users = await User.aggregate([
            { $match:
                    { average_rating: { $gt: 4 },
                        roles: { $elemMatch: { $eq: new mongoose.Types.ObjectId(process.env.userid) } }}
            },
            { $limit: 6 },
            { $sort: { 'product_done_count': -1 } },// Giới hạn chỉ lấy 6 kết quả đầu tiên
            { $project: { _id: 1,username:1, completed_orders: 1, name : 1,product_done_count: 1,average_rating:1,avatar: 1 } } // Chỉ lấy ra user_id và số đơn hàng hoàn thành
        ])

        res.status(200).json( users)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProduct1k = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $match:
                    { reserve_price: { $lt: 1000 },
                        status : 3,
                        finish_time: {$gt: new Date(), $exists: true},
                    }
            },
            { $limit: 10 },
            { $sort: { 'reserve_price': 1 }},
            { $project: { _id: 1, product_name : 1,reserve_price: 1,main_image: 1 } }
        ])

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getRareProduct = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $match:
                    {
                        status : 3,
                        finish_time: {$gt: new Date(), $exists: true},
                    }
            },
            { $sort: { 'reserve_price': -1 }},
            { $limit: 10 },
            { $project: { _id: 1, product_name : 1,reserve_price: 1,final_price:1,main_image: 1 }}
        ])

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getProductPrepareEnd = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $match:
                    {
                        status : 3,
                        finish_time: { $lt : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
                    }
            },
            { $limit: 10 },
            { $project: { _id: 1, product_name : 1,reserve_price: 1,final_price:1,main_image: 1,finish_time:1 } }
        ])

        res.status(200).json(products)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
