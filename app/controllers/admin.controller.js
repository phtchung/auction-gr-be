const {mongoose} = require('mongoose')
const Product = require("../models/product.model");
const Request = require("../models/request.model");
const Delivery = require("../models/delivery.model");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const {adminProductStatus} = require("../utils/constant");
const User = require("../models/user.model");
const Role = require("../models/role.model");


// API để lấy thông tin cá nhân của người dùng hiện tại
exports.adminBoard = (req, res) => {
    res.status(200).send('Admin Content.')
}

exports.getAdminProfile = async (req, res) => {
    try {
        // Lấy thông tin người dùng hiện tại từ JWT token đã xác thực
        const userId = req.userId

        // Sử dụng Mongoose để tìm người dùng dựa trên userId
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ message: 'User not found.' })
        }

        // Lấy danh sách các vai trò của người dùng
        const roles = await Role.find({ _id: { $in: user.roles } })

        // Loại bỏ mật khẩu khỏi thông tin người dùng
        const userWithoutPassword = {
            _id: user._id,
            email: user.email,
            name: user.name,
            roles: roles.map((role) => role.name)
        }

        res.status(200).json(userWithoutPassword)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

exports.adminGetRequestCount = async (req, res) => {
    try {
        const countNewReq = await Request.countDocuments({status: 1})

        const countApproved = await Request.countDocuments({
            status: 2
        })

        const countReject = await Request.countDocuments({
            status: 13
        })

        const countCancel = await Product.countDocuments({
            status: 11
        })
        const countBidding = await Product.countDocuments({
            status: 3
        })
        const countAdminReqTracking = {
            countNewReq,
            countApproved,
            countReject,
            countCancel,
            countBidding,
        }
        res.status(200).json(countAdminReqTracking)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetRequestList = async (req, res) => {
    try {
        const status = req.body.status
        let adminRequestList

        if (status === 1 || status === 2 || status === 13) {
            adminRequestList = await Request.find({
                status: status
            }).populate('seller_id', 'username phone')
        } else {
            adminRequestList = await Product.find({
                status: status
            }).populate('seller_id', 'username phone')
        }

        res.status(200).json({adminRequestList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetBiddingProductList = async (req, res) => {
    try {
        const admin_status = adminProductStatus(req.body?.admin_status)

        const adminBiddingList = await Product.find({
                admin_status: admin_status
            }).populate('seller_id', 'username phone')

        return res.status(200).json({adminBiddingList, admin_status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetBiddingProductCount = async (req, res) => {
    try {
        const countNewProduct = await Product.countDocuments({admin_status: 'N',type_of_auction:1})

        const countNewProductMinus = await Product.countDocuments({admin_status: '-N',type_of_auction:-1})

        const countProductBid = await Product.countDocuments({
            admin_status: 'B'
        })

        const countProductConfirm = await Product.countDocuments({
            admin_status: 'C'
        })

        const countProductSuccess = await Product.countDocuments({
            admin_status: 'S'
        })
        const countProductDelivery = await Product.countDocuments({
            admin_status: 'D'
        })
        const countProductCompleted = await Product.countDocuments({
            admin_status: 'E'
        })
        const countProductCancel = await Product.countDocuments({
            admin_status: 'R'
        })
        const countProductFailure = await Product.countDocuments({
            admin_status: 'F'
        })
        const countProductReturn = await Product.countDocuments({
            admin_status: 'G'
        })
        const countAdminReqTracking = {
            countNewProduct,
            countNewProductMinus,
            countProductBid,
            countProductConfirm,
            countProductSuccess,
            countProductDelivery,
            countProductCompleted,
            countProductCancel,
            countProductFailure,
            countProductReturn,
        }
        res.status(200).json(countAdminReqTracking)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetRequestDetail = async (req, res) => {
    try {
        const requestId = req.params.requestId

        const request = await Product.findOne({
            _id: new mongoose.Types.ObjectId(requestId)
        })
        if (!request) {
            const newReq = await Request.findOne({
                _id: new mongoose.Types.ObjectId(requestId)
            })
            return res.status(200).json(newReq)
        }

        const deliData = await Delivery.findOne({
            product_id: new mongoose.Types.ObjectId(request._id)
        }).select('address name phone note completed_at')

        res.status(200).json({...request._doc, deliData})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


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
                category_id: req.body?.category,
                type_of_auction: req.body?.type_of_auction,
                start_time: req.body?.start_time,
                finish_time: req.body?.finish_time,
              }
            })

        if (!request) {
            return res.status(500).json({message: 'Không tìm thấy yêu cầu đấu giá!'})
        }  else {
            const product = new Product({
                request_id: request?._id,
                description: request?.description,
                product_name: request?.product_name,
                category_id: req.body?.category,
                status : 2,
                rank: request?.rank,
                reserve_price: parseInt(request?.reserve_price),
                sale_price: parseInt(request?.sale_price),
                shipping_fee: parseInt(request?.shipping_fee),
                step_price: parseInt(request?.step_price),
                seller_id: request?.seller_id,
                type_of_auction: req.body?.type_of_auction,
                image_list: request?.image_list,
                start_time: req.body?.start_time,
                finish_time: req.body?.finish_time,
                main_image: request?.main_image,
                request_time:request?.createdAt,
            })
            await product.save();
            return res.status(200).json({data: product, message: 'Tạo phiên đấu giá thành công'})
        }

    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.adminRejectRequest = async (req, res) => {
    try {
        const request_id = req.body?.req_id
        const request = await Request.findOneAndUpdate({
                _id: request_id,
                status: 1
            },
            {
                $set: {
                    status: 13,
                    reason:req.body?.reason,
                    reject_time:req.body?.reject_time,
                }
            })
        if (!request) {
            return res.status(500).json({message: 'Không tìm thấy yêu cầu đấu giá!'})
        }

        return res.status(200).json({ message: 'Từ chối yêu cầu thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminCreateProductAution = async (req, res) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const adminId = req.userId
        const seller_id = new mongoose.Types.ObjectId(adminId)

        if (!req.files || req.files.length === 0) {
            return res.status(500).send({message: "Please upload at least one file!"});
        }

        //Single file
        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file('admin'+ Date.now()+ adminId + req.files['singlefile[]'][0].originalname);
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
            const blob = bucket.file( 'admin'+ Date.now()+ adminId + file.originalname);
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
            // category_id:new mongoose.Types.ObjectId(req.body?.category_id),
            description: req.body?.description,
            product_name: req.body?.product_name,
            rank: req.body?.rank,
            reserve_price: parseInt(req.body?.reserve_price),
            sale_price: parseInt(req.body?.sale_price),
            shipping_fee: parseInt(req.body?.shipping_fee),
            step_price: parseInt(req.body?.step_price),
            seller_id: seller_id,
            admin_status: req.body.type_of_auction === '1' ? 'N':'-N',
            type_of_auction: req.body?.type_of_auction,
            start_time:req.body?.start_time,
            finish_time:req.body?.finish_time,
            image_list: imageUrls,
            main_image:main_image,
        })
        await product.save();
        res.status(200).json(product)
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.adminCancelProduct = async (req, res) => {
    try {
    const product_id = req.body?.req_id
        const cancel_time = req.body?.reject_time

    const product = await Product.findOneAndUpdate({
            _id: new mongoose.Types.ObjectId(product_id),
            admin_status: { $in: ['N', '-N'] }
        },
        {
            $set: {
                admin_status: 'R',
                cancel_time:cancel_time,
            }
        })

        if (!product) {
            return res.status(500).json({message: 'Không tìm thấy sản phẩm đấu giá!'})
        }
        res.status(200).json({ message: `Xóa sản phẩm đấu giá thành công` });

    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
