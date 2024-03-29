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
