const Request = require("../models/request.model");
const {mongoose} = require("mongoose");
const Product = require("../models/product.model");
const Auction = require("../models/auction.model");
const schedule = require("node-schedule");
const sse = require("../sse/index")
const Bid = require("../models/bid.model");
require('dotenv').config()
const User = require("../models/user.model");
const {sendEmailAuctionSuccess} = require("../utils/helper");
const {formatDateTime} = require("../utils/constant");

exports.endAuctionNormal = async (auctionId,auctions) => {
    const auc = await Auction.findOne({
        _id: new mongoose.Types.ObjectId(auctionId),
        status: 3,
    });
    if(auc){
        let data
        if (auc?.winner_id && auc?.final_price) {
            auc.status = 4
            auc.victory_time = auc.finish_time
            const temp = new Date(auc.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            auc.delivery = {
                ...auc.delivery,
                procedure_complete_time : temp
            }
            await auc.save()
            data = {
                winner : auc?.winner_id.toString(),
                final_price : auc?.final_price,
                url : '/'
            }
        }else {
            auc.status = 10
            await auc.save()

            data = {
                winner : null,
                final_price : null,
                url : '/'
            }
        }
        sse.send( data, `finishAuction_${auc._id.toString()}`);
        if(auc.status === 4 ){
            const user = await User.findOne({
                _id : new mongoose.Types.ObjectId(auc.winner_id)
            })
            let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${auc._id.toString()}?status=4`
            if(user.receiveAuctionSuccessEmail){
                await sendEmailAuctionSuccess({ email: user.email , productName : auc?.auction_name , url, price : auc.final_price , deadline : formatDateTime(auc.delivery.procedure_complete_time)})
            }
        }
    }
    delete auctions[auctionId];
};


exports.endAuctionOnline = async (auctionId ,auctions) => {
    const auc = await Auction.findOne({
        _id: new mongoose.Types.ObjectId(auctionId),
        status: 3,
    });
    if(auc){
        let data
        const bid = await Bid.find({
            auction_id: new mongoose.Types.ObjectId(auctionId),
        }).limit(1)
            .sort({ bid_time: -1 })

        if (bid.length !== 0){
            const winner = await User.findOne({
                username : bid[0].username
            })

            auc.status = 4
            auc.victory_time = auc.finish_time
            const temp = new Date(auc.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            auc.delivery = {
                ...auc.delivery,
                procedure_complete_time : temp
            }
            auc.final_price = bid[0].bid_price
            auc.winner_id = winner._id
            await auc.save()
            data = {
                winner : auc?.winner_id.toString(),
                final_price : auc?.final_price,
                url : '/'
            }
        }else{
            auc.status = 10
            await auc.save()
            data = {
                winner : null,
                final_price : null,
                url : '/'
            }
        }
        sse.send( data, `finishAuctionOnline_${auc._id.toString()}`);
        if(auc.status === 4 ){
            const user = await User.findOne({
                _id : new mongoose.Types.ObjectId(auc.winner_id)
            })
            let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${auc._id.toString()}?status=4`
            if(user.receiveAuctionSuccessEmail){
                await sendEmailAuctionSuccess({ email: user.email , productName : auc?.auction_name , url, price : auc.final_price , deadline : formatDateTime(auc.delivery.procedure_complete_time)})
            }
        }
    }
    delete auctions[auctionId];
};

exports.adminApproveAuction = async (req, res , auctions) => {
    try {
        const request_id = req.body?.rq_id
        const {category ,type_of_auction,start_time,finish_time } = req.body

        if(!category || !type_of_auction || !start_time || !finish_time || start_time > finish_time){
            return {
                data: [],
                error: true,
                message: "Không đủ thông tin để tạo yêu cầu đấu giá hoặc yêu cầu không hợp lệ",
                statusCode: 500,
            };
        }
        const rq = await Request.findOne({
            _id: new mongoose.Types.ObjectId(request_id),
            status: 1
        })
        if (!rq) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy yêu cầu đấu giá",
                statusCode: 500,
            };
        }
        if(parseInt(type_of_auction) === -1 && rq.auction_live === 0){
            return {
                data: [],
                error: true,
                message: "Yêu cầu đấu giá không hợp lệ",
                statusCode: 500,
            };
        }
        const request = await Request.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(request_id),
            },
            {
                $set: {
                    status: 2,
                    category_id: new mongoose.Types.ObjectId(category),
                    type_of_auction:parseInt(type_of_auction),
                    start_time: new Date(new Date(start_time).getTime() - 7 * 60 * 60 * 1000),
                    finish_time: new Date(new Date(finish_time).getTime() - 7 * 60 * 60 * 1000),
                }
            })

        await Product.findOneAndUpdate({
                _id : request.product_id
            },
            {
                category_id : new mongoose.Types.ObjectId(category),
                })

            const auction = new Auction({
                request_id: request?._id,
                auction_name: request?.request_name,
                category_id: new mongoose.Types.ObjectId(category),
                status: 2,
                reserve_price: request?.reserve_price,
                sale_price: request?.sale_price,
                shipping_fee: request?.shipping_fee,
                step_price: request?.step_price,
                seller_id: request?.seller_id,
                type_of_auction: type_of_auction,
                start_time: start_time,
                finish_time: finish_time,
                main_image: request?.main_image,
                request_time: request?.createdAt,
                auction_live : request?.auction_live,
                product_id : request?.product_id,
                admin_belong : 0,
                view :0,
                approved_at : new Date(),
                bids:[]
            })

            await auction.save();

            const endTime = new Date(auction.finish_time);
            const auctionId = auction._id.toString()
            auctions[auctionId] = { time : endTime , job : null };

            if(auction.auction_live === 0){
                auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                    await endAuctionNormal(auctionId , auctions);
                });
            }else {
                auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                    await endAuctionOnline(auctionId , auctions);
                });
            }

            return { data: auction, error: false, message: "Tạo phiên đấu giá thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: "Sorry an error occurred",
            statusCode: 500,
        };
    }
}

exports.adminRejectRequest = async (req) => {
    try {
        const request_id = req.body?.req_id
        const request = await Request.findOneAndUpdate({
                _id: request_id,
                status: 1
            },
            {
                $set: {
                    status: 13,
                    reason: req.body?.reason,
                    reject_time: req.body?.reject_time,
                }
            })
        if (!request) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy yêu cầu đấu giá",
                statusCode: 500,
            };
        }
        return { data: request, error: false, message: "Từ chối yêu cầu thành công", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR",
            statusCode: 500,
        };
    }
}

exports.acceptReturnProduct = async (req) => {
    try {
        const auctionId = req.body?.product_id
        const auction = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(auctionId),
                status: 9
            },
            {
                $set: {
                    status: 14,
                    'delivery.status': 14,
                    'delivery.approve_return_time': new Date()
                }
            })

        if (!auction || auction.status !== 9) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy sản phẩm",
                statusCode: 404,
            };
        }
        return { data: auction, error: false, message: "Phê duyệt yêu cầu trả hàng thành công", statusCode: 200 };
    } catch (error) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR",
            statusCode: 500,
        };
    }
}

exports.denyReturnProduct = async (req) => {
    try {
        const auctionId = req.body?.product_id
        const auction = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(auctionId),
                status: 9
            },
            {
                $set: {
                    status: 15,
                    'delivery.status': 15,
                    'delivery.deny_return_time': new Date()
                }
            })

        if (!auction || auction.status !== 9) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy sản phẩm",
                statusCode: 404,
            };
        }
        return { data: auction, error: false, message: "Từ chối yêu cầu trả hàng thành công", statusCode: 200 };

    } catch (error) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR",
            statusCode: 500,
        };
    }
}

exports.updateStatusByAdmin = async (req) => {
    try {
        const newStatus = parseInt(req.body.newState)
        const auction_id = req.body?.product_id
        const status = req.body?.state
        const now = new Date()
        var auction
        const check = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(auction_id),
        })
        if (!check || check.status !== status) {
            return {
                data: [],
                error: true,
                message: "Product not found.",
                statusCode: 404,
            };
        }
        let set = {
            status: newStatus,
            'delivery.status': newStatus,
        }
        if (status === 5) {
            set['delivery.confirm_time'] = now;
        }else if(status === 6){
            set['delivery.delivery_start_time'] = now;
        }

        auction = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(auction_id),
                admin_belong: 1
            },
            {
                $set: set
            })
        return { data: auction, error: false, message: "success", statusCode: 200, status : newStatus };

        // if (status === 5) {
        //     product = await Product.findOneAndUpdate({
        //             _id: new mongoose.Types.ObjectId(productId),
        //             admin_belong: 1
        //         },
        //         {
        //             $set: {
        //                 status: newStatus,
        //                 'product_delivery.status': newStatus,
        //                 'product_delivery.confirm_time': now
        //             }
        //         })
        //     return { data: product, error: false, message: "success", statusCode: 200, status : 6 };
        //
        // } else if (status === 6) {
        //     product = await Product.findOneAndUpdate({
        //             _id: new mongoose.Types.ObjectId(productId),
        //             admin_belong: 1
        //         },
        //         {
        //             $set: {
        //                 status: newStatus,
        //                 'product_delivery.status': newStatus,
        //                 'product_delivery.delivery_start_time': now
        //             }
        //         })
        //     return { data: product, error: false, message: "success", statusCode: 200, status : 7 };
        // }
    } catch (error) {
        return {
            data: [],
            error: true,
            message: "Internal server error.",
            statusCode: 500,
        };
    }
}

async function endAuctionNormal(auctionId , auctions) {

    const auc = await Auction.findOne({
        _id: new mongoose.Types.ObjectId(auctionId),
        status: 3,
    })

    if(auc){
        let data
        if (auc?.winner_id && auc?.final_price) {
            auc.status = 4
            auc.victory_time = auc.finish_time
            const temp = new Date(auc.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            auc.delivery = {
                ...auc.delivery,
                procedure_complete_time : temp
            }
            await auc.save()
            data = {
                winner : auc?.winner_id.toString(),
                final_price : auc?.final_price,
                url : '/'
            }

        }else {
            auc.status = 10
            await auc.save()

            data = {
                winner : null,
                final_price : null,
                url : '/'
            }
        }
        sse.send( data, `finishAuction_${auc._id.toString()}`);
        if(auc.status === 4 ){
            const user = await User.findOne({
                _id : new mongoose.Types.ObjectId(auc.winner_id)
            })
            let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${auc._id.toString()}?status=4`
            if(user.receiveAuctionSuccessEmail){
                await sendEmailAuctionSuccess({ email: user.email , productName : auc?.auction_name , url, price : auc.final_price , deadline : formatDateTime(auc.delivery.procedure_complete_time)})
            }
        }
    }
    delete auctions[auctionId];
}

async function endAuctionOnline(auctionId , auctions) {
    const auc = await Auction.findOne({
        _id: new mongoose.Types.ObjectId(auctionId),
        status: 3,
    });
    if(auc){
        let data
        const bid = await Bid.find({
            auction_id: new mongoose.Types.ObjectId(auctionId),
        }).limit(1)
            .sort({ bid_time: -1 })

        if (bid.length !== 0){
            const winner = await User.findOne({
                username : bid[0].username
            })

            auc.status = 4
            auc.victory_time = auc.finish_time
            const temp = new Date(auc.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            auc.delivery = {
                ...auc.delivery,
                procedure_complete_time : temp
            }
            auc.final_price = bid[0].bid_price
            auc.winner_id = winner._id
            await auc.save()
            data = {
                winner : auc?.winner_id.toString(),
                final_price : auc?.final_price,
                url : '/'
            }
        }else{
            auc.status = 10
            await auc.save()
            data = {
                winner : null,
                final_price : null,
                url : '/'
            }
        }
        sse.send( data, `finishAuctionOnline_${auc._id.toString()}`);
        if(auc.status === 4 ){
            const user = await User.findOne({
                _id : new mongoose.Types.ObjectId(auc.winner_id)
            })
            let url = `${process.env.SERVER}winOrderTracking/winOrderDetail/${auc._id.toString()}?status=4`
            if(user.receiveAuctionSuccessEmail){
                await sendEmailAuctionSuccess({ email: user.email , productName : auc?.auction_name , url, price : auc.final_price , deadline : formatDateTime(auc.delivery.procedure_complete_time)})
            }
        }
    }
    delete auctions[auctionId];
};
