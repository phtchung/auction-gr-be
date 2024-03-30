const Product = require("../models/product.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
require('dotenv').config()

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


exports.UserReturnProduct = async (req) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const userId = req.userId
        const productId = req.body?.id
        if (!req.files || req.files.length === 0) {
            return {
                data: [],
                error: true,
                message: "Please upload at least one file!",
                statusCode: 500,
            };
        }

        //multifile
        const uploadPromises = req.files.map(file => {
            const blob = bucket.file(  Date.now()+ userId + file.originalname);
            const blobStream = blob.createWriteStream(
                {resumable: false});

            return new Promise((resolve, reject) => {
                blobStream.on("error", (err) => {
                    reject(err);
                });
                blobStream.on("finish", async () => {
                    const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                    resolve({url: publicUrl});
                });
                blobStream.end(file.buffer);
            });
        });

        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(item => item.url);

        const returnProduct = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                winner_id: new mongoose.Types.ObjectId(userId),
                status : 7
            },
            {
                $set: {
                    status: 9,
                    'product_delivery.status': 9,
                    'product_delivery.return_time': new Date(),
                    'product_delivery.return_image_list': imageUrls,
                    'product_delivery.return_reason':req.body?.return_reason,
                }
            })
        await returnProduct.save();
        return { data: returnProduct, error: false, message: "Yêu cầu trả hàng được gửi thành công!", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR!",
            statusCode: 500,
        };
    }
}
