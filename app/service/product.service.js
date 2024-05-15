const Product = require("../models/product.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const {calculatePoints} = require("../utils/constant");
const Auction = require("../models/auction.model");
require('dotenv').config()

exports.updateByWinner = async (req, res) => {
    try {
        const userId = req.userId
        const newStatus =parseInt( req.body.newState)
        const productId = req.body?.product_id
        const status = req.body?.state
        var product

        const check = await Auction.findOne({
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
        const now = new Date()
        const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
        let point = calculatePoints(check.final_price)
        let set = {
            status: newStatus,
            'delivery.status': newStatus,
        }
        let query = {
            _id: new mongoose.Types.ObjectId(productId),
        }
        if(status === 7 && newStatus === 8 ){
            query.winner_id =  new mongoose.Types.ObjectId(userId)
            set.is_review  = 0
            set.review_before =  { $add: ["$victory_time", 30 * 24 * 60 * 60 * 1000] }
            set['delivery.completed_time'] =  now
        }else if (status === 7 && newStatus === 9){
            query.winner_id =  new mongoose.Types.ObjectId(userId)
            set['delivery.return_time'] =  now
        }if(status === 5){
            query.seller_id = new mongoose.Types.ObjectId(userId)
            set['delivery.confirm_time'] =  now
        }else if(status === 6){
            query.seller_id = new mongoose.Types.ObjectId(userId)
            set['delivery.delivery_start_time'] =  now
            set['delivery.return_before'] =  tenDaysLater
        }

        if(status === 7 && newStatus === 8 ){
            product = await Auction.findOneAndUpdate(query,
                [
                    {
                        $set: set
                    }
                ]
            )
            await User.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(userId) },
                { $inc: {  point: point } }
            )
            await User.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(check.seller_id) },
                { $inc: {   product_done_count: 1 } }
            );

        }else {
            product = await Auction.findOneAndUpdate(query,
                {
                    $set: set
                })
        }

        return { data: product, error: false, message: "success", statusCode: 200, status : newStatus };
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

        const returnProduct = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                winner_id: new mongoose.Types.ObjectId(userId),
                status : 7
            },
            {
                $set: {
                    status: 9,
                    'delivery.status': 9,
                    'delivery.return_time': new Date(),
                    'delivery.return_image_list': imageUrls,
                    'delivery.return_reason':req.body?.return_reason,
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
