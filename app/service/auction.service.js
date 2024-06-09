const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Auction = require("../models/auction.model");
const crypto = require("crypto");
const https = require("https");
require('dotenv').config()
const moment = require("moment/moment");
const {v1: uuid} = require("uuid");
const CryptoJS = require("crypto-js");
const axios = require("axios");
const Bid = require("../models/bid.model");
const sse = require("../sse");
const {sendEmailAuctionSuccess} = require("../utils/helper");
const {formatDateTime} = require("../utils/constant");
const User = require("../models/user.model");
require('dotenv').config()


exports.BuyProduct = async (req, res) => {
    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
            seller_id: {$ne: winner_id},
            $or: [
                {sale_price: parseInt(req.body.final_price)},
                {final_price: {$exists: false}},
            ],
        })
        if (product) {
            product.status = 4
            product.victory_time = new Date()
            product.final_price =  req.body.final_price
            product.winner_id = winner_id
            const temp = new Date()
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 0);
            product.delivery = {
                ...product.delivery,
                status : 4,
                procedure_complete_time : temp
            }

            const bid = new Bid({
                auction_id: new mongoose.Types.ObjectId(productId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            if (bid) {
                product.bids.push(bid._id)
            }
            await Promise.all([product.save(), bid.save()]);
        }else {
            return {
                data: [],
                error: true,
                message: "Không đủ điều kiện mua sản phẩm",
                statusCode: 404,
            };
        }
        return { data: product, error: false, message: "Thực hiện trả giá thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
    }
}

exports.BuyProductAuctionPriceDown = async (req, res) => {
    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
            seller_id: {$ne: winner_id},
            type_of_auction: -1,
        })
        if (product) {
            product.status = 4
            product.victory_time = new Date()
            product.final_price =  req.body.final_price
            product.winner_id = winner_id
            const temp = new Date()
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 0);
            product.delivery = {
                ...product.delivery,
                status : 4,
                procedure_complete_time : temp
            }
            await Promise.all([product.save()]);
        }else {
            return {
                data: [],
                error: true,
                message: "Không đủ điều kiện mua sản phẩm",
                statusCode: 404,
            };
        }
        return { data: product, error: false, message: "Thực hiện trả giá thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
    }
}

exports.CreateBid = async (req) => {
    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)
        const bid_price = parseInt(req.body.final_price)
        if(!productId || !winner_id || !bid_price){
            return {
                data: [],
                error: true,
                message: 'Trả giá thất bại',
                statusCode: 404,
            };
        }

        const product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            status: 3,
            auction_live : 0,
            start_time: {$lt: new Date()},
            finish_time: {$gt: new Date()},
            seller_id: {$ne: winner_id},
            $or: [
                {final_price: {$lt: parseInt(req.body.final_price)}},
                {final_price: {$exists: false}},
            ],
        })

        if (!product){
            return {
                data: [],
                error: true,
                message: 'Không tìm thấy sản phẩm đấu giá hoặc giá đấu thấp hơn giá hiện tại.',
                statusCode: 404,
            };
        }

        if(product.sale_price <= bid_price && bid_price > product.final_price){
            // chuyêển qua mua trực tiếp
            product.status = 4
            product.victory_time = new Date()
            product.final_price =  product.sale_price
            product.winner_id = winner_id
            const temp = new Date()
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 0);
            product.delivery = {
                ...product.delivery,
                status : 4,
                procedure_complete_time : temp
            }

            const bid = new Bid({
                auction_id: new mongoose.Types.ObjectId(productId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            if (bid) {
                product.bids.push(bid._id)
            }
            await Promise.all([product.save(), bid.save()]);
            return { data: product, error: false, message: "Thực hiện trả giá thành công", statusCode: 200, notify : 1 };
        }else{
            product.final_price = req.body.final_price
            product.winner_id =  winner_id

            const bid = new Bid({
                auction_id: new mongoose.Types.ObjectId(productId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })

            if (bid) {
                product.bids.push(bid._id)
            }
            await Promise.all([product.save(), bid.save()]);
            return { data: product, error: false, message: "Thực hiện trả giá thành công", statusCode: 200 };
        }

    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
    }
}

exports.finishAuctionOnline = async (req, res) => {
    try {
        const productId = req.body.productId
       let product

        const maxBid = await Auction.findOne({ product_id: new mongoose.Types.ObjectId(productId) })
            .sort({ bid_time: -1 })
            .populate('product_id','status finish_time auction_live ')
            .lean();
        console.log(maxBid)
        if(maxBid) {
            if (maxBid && maxBid.product_id.status === 3 && maxBid.product_id.finish_time.getTime() > new Date().getTime() && maxBid.product_id.auction_live === 1) {
                const temp = new Date(maxBid.product_id.finish_time);
                temp.setDate(temp.getDate() + 2);
                temp.setHours(23, 59, 59, 999);

                product = await Product.findOneAndUpdate({
                        _id: new mongoose.Types.ObjectId(productId),
                        status: 3,
                    }, [
                        {
                            $set: {
                                status: 4,
                                isDeliInfor: 0,
                                winner_id: maxBid.user,
                                final_price: maxBid.bid_price,
                                victory_time: maxBid.product_id.finish_time,
                                procedure_complete_time: temp,
                            }
                        }
                    ],
                    { new: true }
                )
            }
        }else {
            product = await Product.findOneAndUpdate({
                        _id: new mongoose.Types.ObjectId(productId)
                    },[
                        {
                            $set: {
                                status: 10,
                            }
                        }
                    ],
                    { new: true }
                )
            }

        return { data: product, error: false, message: "Cập nhật trạng thái sản phẩm thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
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
            const temp = new Date(product.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            product.procedure_complete_time = temp
            await product.save()
        }else {
            product.status = 10
            await product.save()
        }
        return { data: product, error: false, message: "Cập nhật trạng thái sản phẩm thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
    }
}

exports.checkoutProduct = async (req, res) => {
    try {
        const userId = req.userId
        const { payment_method ,product_id , address, phone , name} = req.body
        console.log(payment_method ,product_id , address, phone , name)
        if( !product_id || !address || !phone || !name ){
            return {
                data: [],
                error: true,
                message: "Chưa điền đủ thông tin",
                statusCode: 500,
            };
        }
        let product = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(req.body.product_id),
            winner_id: new mongoose.Types.ObjectId(userId)
        }).populate('product_id')

        if (product.status === 4) {
            // = 0 tiền mặt , bằng 1 : momo , bằng 2 : zlpay
            if(req.body?.payment_method === 0){
                product.delivery = {
                    ...product.delivery,
                    name: req.body.name,
                    payment_method: "Tiền mặt",
                    address: req.body.address,
                    phone: req.body.phone,
                    status: 5,
                }
                product.status = 5
                await product.save()

                return { data: product, error: false, message: "Thành công", statusCode: 200, payUrl : process.env.redirectUrl };
            }else if(req.body?.payment_method === 1){
                var partnerCode = "MOMO"
                // var accessKey = process.env.accessKey;

                var accessKey = 'F8BBA842ECF85';
                var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
                // chuỗi ngẫu nhiên để phân biệt cái request
                var requestId = partnerCode + new Date().getTime() + "id";
                // mã đặt đơn
                var orderId = new Date().getTime() + ":0123456778";
                //
                var orderInfo = "Thanh toán sản phẩm "+ product?.product_id?.product_name;
                // cung cấp họ về một cái pages sau khi thanh toán sẽ trở về trang nớ
                var redirectUrl = process.env.redirectUrl;
                // Trang thank you
                var ipnUrl = process.env.ipnUrl
                // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
                var amount = 100000 + product.final_price + product.shipping_fee
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
                console.log(signature)
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
                        console.log('aaa')
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
                            product.delivery = {
                                ...product.delivery,
                                name: req.body.name,
                                payment_method: "Momo",
                                address: req.body.address,
                                phone: req.body.phone,
                                status: 5,
                            }
                            product.status = 5
                            await product.save()
                        }
                        return { data: product, error: false, message: "Thành công", statusCode: 200,payUrl: url };

                    });
                });

                reqq.on("error", (e) => {
                    console.log(`problem with request: ${e.message}`);
                    return {
                        data: [],
                        error: true,
                        message: " an error occurred",
                        statusCode: 500,
                    };
                })
                console.log("Sending....");
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
                    description: `Auction - Thanh toán cho sản phẩm ${product?.product_id?.product_name}`,
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
                    product.delivery = {
                        ...product.delivery,
                        name: req.body.name,
                        payment_method: "Zalopay",
                        address: req.body.address,
                        phone: req.body.phone,
                        status: 5,
                    }
                    product.status = 5
                    await product.save()
                }
                return { data: product, error: false, message: "Thành công", statusCode: 200,payUrl: returnUrl };
            }
        }
    } catch (err) {
        return {
            data: [],
            error: true,
            message: " an error occurred",
            statusCode: 500,
        };
    }
}



