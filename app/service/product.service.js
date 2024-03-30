const Product = require("../models/product.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");

exports.updateByWinner = async (req, res) => {
    try {
        const userId = req.userId
        const newStatus =parseInt( req.body.newState)
        const productId = req.body?.product_id
        const status = req.body?.state
        var product
        const now = new Date()
        const check = await Product.findOne({
            _id: new mongoose.Types.ObjectId(productId),
        })
        if (!check || check.status !== status) {
            return {
                data: [],
                error: true,
                message: "Product not found.",
                statusCode: 404,
            };
        }
        if(status === 7 && newStatus === 8 ){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    winner_id: new mongoose.Types.ObjectId(userId),
                },
                [
                    {
                        $set: {
                            status: newStatus,
                            'product_delivery.status': newStatus,
                            'product_delivery.completed_time': now,
                            is_review : 0,
                            review_before: { $add: ["$victory_time", 30 * 24 * 60 * 60 * 1000] },
                        }
                    }
                ]
            )
            await User.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(userId),
                },
                [
                    {
                        $set: {
                            point: { $add: ["$point", 100] },
                        }
                    }
                ])
            return { data: product, error: false, message: "success", statusCode: 200, status : 8 };
        }else if(status === 7 && newStatus === 9){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    winner_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.return_time': now
                    }
                })
            return { data: product, error: false, message: "success", statusCode: 200, status : 9 };

        }
        else if(status === 5){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    seller_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.confirm_time': now
                    }
                })
            return { data: product, error: false, message: "success", statusCode: 200, status : 6 };

        } else if(status === 6){
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    seller_id: new mongoose.Types.ObjectId(userId),
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.delivery_start_time': now
                    }
                })
            return { data: product, error: false, message: "success", statusCode: 200, status : 7 };
        }
    } catch (error) {
        return {
            data: [],
            error: true,
            message: "Internal server error.",
            statusCode: 500,
        };
    }
}
