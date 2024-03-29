const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Auction = require("../models/auction.model");

exports.BuyProduct = async (req, res) => {

    try {
        const userId = req.userId
        const username = req.username
        const productId = req.body.productId
        const winner_id = new mongoose.Types.ObjectId(userId)

        const product = await Product.findOne({
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
            product.isDeliInfor = 0
            product.winner_id = winner_id
            const temp = new Date(product.finish_time);
            temp.setDate(temp.getDate() + 2);
            temp.setHours(23, 59, 59, 999);
            product.procedure_complete_time = temp
            await product.save()

            const bid = new Auction({
                product_id: new mongoose.Types.ObjectId(productId),
                user: new mongoose.Types.ObjectId(userId),
                username: username,
                bid_price: parseInt(req.body?.final_price),
                bid_time: new Date(),
            })
            await bid.save();
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
