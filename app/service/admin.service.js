const Request = require("../models/request.model");
const {mongoose} = require("mongoose");
const Product = require("../models/product.model");
const Auction = require("../models/auction.model");


exports.adminApproveAuction = async (req, res) => {
    try {
        const request_id = req.body?.rq_id
        const request = await Request.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(request_id),
                status: 1
            },
            {
                $set: {
                    status: 2,
                    category_id: new mongoose.Types.ObjectId(req.body?.category),
                    type_of_auction: req.body?.type_of_auction,
                    start_time: req.body?.start_time,
                    finish_time: req.body?.finish_time,
                }
            })

        if (!request) {
            return res.status(500).json({message: 'Không tìm thấy yêu cầu đấu giá!'})
        } else {
            await Product.findOneAndUpdate({
                _id : request.product_id
            },
                {
                    category_id : new mongoose.Types.ObjectId(req.body?.category),
                })

            const auction = new Auction({
                request_id: request?._id,
                auction_name: request?.request_name,
                category_id: new mongoose.Types.ObjectId(req.body?.category),
                status: 2,
                reserve_price: parseInt(request?.reserve_price),
                sale_price: parseInt(request?.sale_price),
                shipping_fee: parseInt(request?.shipping_fee),
                step_price: parseInt(request?.step_price),
                seller_id: request?.seller_id,
                type_of_auction: req.body?.type_of_auction,
                start_time: req.body?.start_time,
                finish_time: req.body?.finish_time,
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
            return { data: auction, error: false, message: "Tạo phiên đấu giá thành công", statusCode: 200 };
        }

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
