const {Storage} = require("@google-cloud/storage");
const mongoose = require("mongoose");
const {format} = require("util");
const Request = require("../models/request.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
require('dotenv').config()

exports.createRequest = async (req) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const userId = req.userId
        const seller_id = new mongoose.Types.ObjectId(userId)

        const  user = await User.findOne({
            _id : seller_id
        }).select('auction_deposit')

        if( !user || !user.auction_deposit ){
            return {
                data: [],
                error: true,
                message: "Phải đăng kí cọc để mở phiên đấu giá!",
                statusCode: 500,
            };
        }

        const {description,product_name,rank,is_used,delivery_from,can_return,reserve_price,shipping_fee,step_price,auction_live} = req.body

        if(!description || !product_name || !rank || !is_used || !delivery_from || !can_return || !reserve_price || !shipping_fee || !step_price
            || !auction_live ){
            return {
                data: [],
                error: true,
                message: "Chưa điền đủ thông tin cần thiết để mở phiên đấu giá!",
                statusCode: 500,
            };
        }

        if (!req.files || req.files.length === 0) {
            return {
                data: [],
                error: true,
                message: "Please upload at least one file!",
                statusCode: 500,
            };
        }

        //Single file
        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file(Date.now()+ userId + req.files['singlefile[]'][0].originalname);
            const blobStream = blob.createWriteStream({ resumable: false });

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({ url: publicUrl });
            });
            blobStream.end(req.files['singlefile[]'][0].buffer);
        });
        const rs = await uploadMainImagePromise;
        const main_image = rs.url

        //multifile
        const uploadPromises = req.files['files[]'].map(file => {
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

        const product = new Product({
            description: description,
            product_name: product_name,
            rank: rank,
            is_used : parseInt(is_used),
            brand:req.body?.brand ? req.body.brand : null,
            delivery_from:delivery_from,
            can_return:parseInt(can_return),
            image_list: imageUrls,
            main_image:main_image,
        })
        await product.save();

        const request = new Request({
            product_id : product._id,
            request_name: product_name,
            reserve_price: parseInt(reserve_price),
            shipping_fee: parseInt(shipping_fee),
            step_price: parseInt(step_price),
            seller_id: seller_id,
            status: 1,
            auction_live:parseInt(auction_live),
            type_of_auction: 1,
            admin_belong : 0
        })

        if(request.auction_live === 0){
            const {sale_price} = req.body
            if(!sale_price || parseInt(sale_price) < request.reserve_price){
                return {
                    data: [],
                    error: true,
                    message: "Chưa đủ thông tin để tạo phiên đấu giá !",
                    statusCode: 500,
                };
            }else {
                request.sale_price = parseInt(sale_price)
            }
        }
        await request.save();

        return { data: request, error: false, message: "success", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: err,
            statusCode: 500,
        };
    }
}
