const mongoose = require('mongoose')
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const Product = require("../models/product.model");
const Review = require("../models/review.model");
const User = require("../models/user.model");
const Auction = require("../models/auction.model");

exports.UserReviewProduct = async (req, res) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const userId = req.userId
        const productId = req.body?.product_id
        var results, imageUrls
        if (req.files || req.files.length !== 0) {
            //multifile
            const uploadPromises = req.files.map(file => {
                const blob = bucket.file(Date.now() + userId + file.originalname);
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

            results = await Promise.all(uploadPromises);
        }
        if (results) {
            imageUrls = results.map(item => item.url);
        }

        const product = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                winner_id: new mongoose.Types.ObjectId(userId),
                status: 8,
                is_review: 0
            },
            {
                $set: {
                    is_review: 1,
                    'delivery.review_time': new Date(),
                }
            })

        const review = new Review({
            user_id: new mongoose.Types.ObjectId(userId),
            auction_id: new mongoose.Types.ObjectId(productId),
            rating: req.body?.rate,
            comment: req.body?.comment,
            rv_image_list: imageUrls ? imageUrls : null,
        })
        await review.save()
        await User.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(userId),
            },
            {$inc: {point: 20}})
        const rate = parseFloat(req.body.rate);

        if (rate) {
            const seller = await User.findOne({_id : product.seller_id})
            if(seller.average_rating === 0){
                seller.average_rating += rate
                seller.rate_count += 1
                await seller.save()
            }else {
                await User.findOneAndUpdate({
                        _id: product.seller_id,
                    },
                    [
                        {
                            $set: {
                                rate_count: {$add: ["$rate_count", 1]},
                                average_rating: {
                                    $divide: [
                                        {
                                            $add: [
                                                {$multiply: ["$average_rating", "$rate_count"]}, rate
                                            ]
                                        },
                                        {$add: ["$rate_count", 1]}
                                    ]
                                }
                            }
                        }
                    ])
            }

        }
        res.status(200).json({message: 'Đánh giá thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.getReview = async (req, res) => {
    try {
        const auctionId = req.body?.auction_id
        const review = await Review.findOne({
            auction_id: new mongoose.Types.ObjectId(auctionId)
        }).populate('user_id','username')
            .populate({
                path: 'auction_id',
                select: 'product_id',
                populate: {
                    path: 'product_id',
                    select: 'product_name main_image'
                }
            });

        res.status(200).json(review)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
