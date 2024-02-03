const Request = require('../models/request.model')
const Product = require('../models/product.model')
const Delivery = require('../models/delivery.model')
const {Storage} = require('@google-cloud/storage')
const mongoose = require('mongoose')
const {ObjectId} = require('mongodb')
const processFile = require("../middlewares/upload");
const {format} = require("util");

exports.getRequest = async (req, res) => {
    try {
        const userId = req.userId
        const start_time = req.query.start_time
        const finish_time = req.query.finish_time

        const requests = await Request.find({
            seller_id: new mongoose.Types.ObjectId(userId),
            createdAt: {
                $gte: new Date(start_time),
                $lte: new Date(finish_time)
            }
        }).select(' _id createdAt product_name status rank')

        const total = {
            total_request: requests.length,
            total_pending: requests.filter((req) => req.status === 1).length,
            total_approved: requests.filter((req) => req.status === 2).length,
            total_rejected: requests.filter((req) => req.status === 13).length
        }

        res.status(200).json({requests, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.createRequest = async (req, res) => {
    try {
        const userId = req.userId
        const seller_id = new mongoose.Types.ObjectId(userId)
        const request = new Request({
            description: req.body.description,
            product_name: req.body.product_name,
            rank: req.body.rank,
            reserve_price: parseInt(req.body.reserve_price),
            sale_price: parseInt(req.body.sale_price),
            shipping_fee: parseInt(req.body.shipping_fee),
            step_price: parseInt(req.body.step_price),
            seller_id: seller_id,
            status: 1,
            type_of_auction: 1
        })

        await request.save()

        res.status(200).json(request)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getRequestDetail = async (req, res) => {
    try {
        const userId = req.userId
        const requestId = req.params.requestId

        const request = await Product.findOne({
            seller_id: new mongoose.Types.ObjectId(userId),
            request_id: new mongoose.Types.ObjectId(requestId)
        })

        const deliData = await Delivery.findOne({
            product_id: new mongoose.Types.ObjectId(request._id)
        }).select('address name phone note completed_at')

        res.status(200).json({...request._doc, deliData})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getRequestHistoryDetail = async (req, res) => {
    try {
        const userId = req.userId
        const requestId = req.params.requestId

        const request = await Request.findOne({
            seller_id: new mongoose.Types.ObjectId(userId),
            _id: new mongoose.Types.ObjectId(requestId)
        })

        res.status(200).json(request)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.upload = async (req, res) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud

    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        await processFile(req, res);

        if (!req.files || req.files.length === 0) {
            return res.status(400).send({message: "Please upload at least one file!"});
        }

        const uploadPromises = req.files.map(file => {
            const blob = bucket.file(1 + file.originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            return new Promise((resolve, reject) => {
                blobStream.on("error", (err) => {
                    reject(err);
                });

                blobStream.on("finish", async () => {
                    const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                    resolve({filename: file.originalname, url: publicUrl});
                });

                blobStream.end(file.buffer);
            });
        });

        Promise.all(uploadPromises)
            .then(results => {
                res.status(200).send({
                    message: "Uploaded the files successfully.",
                    files: results,
                });
            })
            .catch(err => {
                res.status(500).send({message: err.message});
            });
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
