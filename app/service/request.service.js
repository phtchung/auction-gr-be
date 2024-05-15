const {Storage} = require("@google-cloud/storage");
const mongoose = require("mongoose");
const {format} = require("util");
const Request = require("../models/request.model");
const Product = require("../models/product.model");
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
            description: req.body?.description,
            product_name: req.body?.product_name,
            rank: req.body?.rank,
            is_used : parseInt(req.body?.is_used),
            brand:req.body?.brand ? req.body.brand : null,
            delivery_from:req.body?.delivery_from,
            can_return:parseInt(req.body?.can_return),
            image_list: imageUrls,
            main_image:main_image,
        })
        await product.save();

        const request = new Request({
            product_id : product._id,
            request_name: req.body?.product_name,
            reserve_price: parseInt(req.body?.reserve_price),
            sale_price: req.body?.sale_price ?  parseInt(req.body?.sale_price) : null,
            shipping_fee: parseInt(req.body?.shipping_fee),
            step_price: parseInt(req.body?.step_price),
            seller_id: seller_id,
            status: 1,
            auction_live:parseInt(req.body?.auction_live),
            type_of_auction: 1,
            admin_belong : 0
        })
        await request.save();

        return { data: request, error: false, message: "success", statusCode: 200 };
    } catch (err) {
        return {
            data: [],
            error: true,
            message: "DATABASE_ERROR!",
            statusCode: 500,
        };
    }
}
