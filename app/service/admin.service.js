const Request = require("../models/request.model");
const {mongoose} = require("mongoose");
const Product = require("../models/product.model");


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
            const product = new Product({
                request_id: request?._id,
                description: request?.description,
                product_name: request?.product_name,
                category_id: new mongoose.Types.ObjectId(req.body?.category),
                status: 2,
                rank: request?.rank,
                reserve_price: parseInt(request?.reserve_price),
                sale_price: parseInt(request?.sale_price),
                shipping_fee: parseInt(request?.shipping_fee),
                step_price: parseInt(request?.step_price),
                seller_id: request?.seller_id,
                type_of_auction: req.body?.type_of_auction,
                is_used : request?.is_used,
                brand:request.brand ? request.brand : null,
                delivery_from:request?.delivery_from,
                can_return:request?.can_return,
                image_list: request?.image_list,
                start_time: req.body?.start_time,
                finish_time: req.body?.finish_time,
                main_image: request?.main_image,
                request_time: request?.createdAt,
            })
            await product.save();
            return { data: product, error: false, message: "Tạo phiên đấu giá thành công", statusCode: 200 };
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
        const productId = req.body?.product_id
        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status: 9
            },
            {
                $set: {
                    status: 14,
                    'product_delivery.status': 14,
                    'product_delivery.approve_return_time': new Date()
                }
            })

        if (!product || product.status !== 9) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy sản phẩm",
                statusCode: 404,
            };
        }
        return { data: product, error: false, message: "Phê duyệt yêu cầu trả hàng thành công", statusCode: 200 };
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
        const productId = req.body?.product_id
        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status: 9
            },
            {
                $set: {
                    status: 15,
                    'product_delivery.status': 15,
                    'product_delivery.deny_return_time': new Date()
                }
            })

        if (!product || product.status !== 9) {
            return {
                data: [],
                error: true,
                message: "Không tìm thấy sản phẩm",
                statusCode: 404,
            };
        }
        return { data: product, error: false, message: "Từ chối yêu cầu trả hàng thành công", statusCode: 200 };

    } catch (error) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR",
            statusCode: 500,
        };
    }
}
