const {mongoose} = require('mongoose')
const Product = require("../models/product.model");
const Request = require("../models/request.model");
const Delivery = require("../models/delivery.model");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const {adminProductStatus, adminRequestStatus} = require("../utils/constant");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Blog = require("../models/blog.model");
const Categories = require("../models/category.model");



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
            return res.status(404).json({message: 'User not found.'})
        }

        // Lấy danh sách các vai trò của người dùng
        const roles = await Role.find({_id: {$in: user.roles}})

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
        res.status(500).json({message: 'Internal server error'})
    }
}

exports.adminGetRequestCount = async (req, res) => {
    try {
        const countNewReq = await Request.countDocuments({status: 1})

        const countApproved = await Product.countDocuments({
            status: 2, admin_belong: {$exists: false}
        })

        const countReject = await Request.countDocuments({
            status: 13, admin_belong: {$exists: false}
        })

        const countCancel = await Product.countDocuments({
            status: 11, admin_belong: {$exists: false}
        })
        const countBidding = await Product.countDocuments({
            status: 3, admin_belong: {$exists: false}
        })
        const countReturn = await Product.countDocuments({
            status: 9, admin_belong: {$exists: false}
        })
        const countAdminReqTracking = {
            countNewReq,
            countApproved,
            countReject,
            countCancel,
            countBidding,
            countReturn
        }
        res.status(200).json(countAdminReqTracking)
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetRequestList = async (req, res) => {
    try {
        const status = adminRequestStatus(req.body?.status)

        let adminRequestList

        // if(status === 34){
        //      adminRequestList = await Product.find({
        //         status: { $in: [3, 4] },
        //     }).populate('seller_id', 'username phone')
        //
        //     return res.status(200).json({adminRequestList, status})
        // }
        if (status === 1 || status === 13) {
            adminRequestList = await Request.find({
                status: status
            }).populate('seller_id', 'username name phone')
        } else {
            adminRequestList = await Product.find({
                status: status,
                admin_belong: {$exists: false}
            }).populate('seller_id', 'username name phone')
        }

        res.status(200).json({adminRequestList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetBiddingProductList = async (req, res) => {
    try {
        const status = adminProductStatus(req.body?.status)

        if (status === 34) {
            const adminBiddingList = await Product.find({
                status: {$in: [3, 4]},
                admin_belong: 1
            }).populate('seller_id', 'username phone')

            return res.status(200).json({adminBiddingList, status})
        }
        const adminBiddingList = await Product.find({
            status: status,
            admin_belong: 1
        }).populate('seller_id', 'username phone')

        return res.status(200).json({adminBiddingList, status})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.adminGetBiddingProductCount = async (req, res) => {
    try {
        const countNewProduct = await Product.countDocuments({status: 2, admin_belong: 1})

        const countProductBid = await Product.countDocuments({
            status: {$in: [3, 4]}, admin_belong: 1
        })

        const countProductConfirm = await Product.countDocuments({
            status: 6, admin_belong: 1
        })

        const countProductSuccess = await Product.countDocuments({
            status: 5, admin_belong: 1
        })
        const countProductDelivery = await Product.countDocuments({
            status: 7, admin_belong: 1
        })
        const countProductCompleted = await Product.countDocuments({
            status: 8, admin_belong: 1
        })
        const countProductCancel = await Product.countDocuments({
            status: 11, admin_belong: 1
        })
        const countProductFailure = await Product.countDocuments({
            status: 10, admin_belong: 1
        })
        const countProductReturn = await Product.countDocuments({
            status: 9, admin_belong: 1
        })
        const countAdminReqTracking = {
            countNewProduct,
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
        }).populate('winner_id category_id', 'phone name')
            .populate('seller_id', 'point average_rating name phone')
        if (!request) {
            const newReq = await Request.findOne({
                _id: new mongoose.Types.ObjectId(requestId)
            }).populate('seller_id category_id', 'point average_rating name')
            return res.status(200).json(newReq)
        }

        // const deliData = await Delivery.findOne({
        //     product_id: new mongoose.Types.ObjectId(request._id)
        // }).select('address name phone note completed_at')

        res.status(200).json({...request._doc})
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
                    reason: req.body?.reason,
                    reject_time: req.body?.reject_time,
                }
            })
        if (!request) {
            return res.status(500).json({message: 'Không tìm thấy yêu cầu đấu giá!'})
        }

        return res.status(200).json({message: 'Từ chối yêu cầu thành công'})
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
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile[]'][0].buffer);
        });

        const rs = await uploadMainImagePromise;
        const main_image = rs.url

        //multifile
        const uploadPromises = req.files['files[]'].map(file => {
            const blob = bucket.file('admin' + Date.now() + adminId + file.originalname);
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
            category_id:new mongoose.Types.ObjectId(req.body?.category),
            description: req.body?.description,
            product_name: req.body?.product_name,
            rank: req.body?.rank,
            reserve_price: parseInt(req.body?.reserve_price),
            sale_price: parseInt(req.body?.sale_price),
            shipping_fee: parseInt(req.body?.shipping_fee),
            step_price: parseInt(req.body?.step_price),
            seller_id: seller_id,
            admin_belong: 1,
            status: 2,
            is_used : parseInt(req.body?.is_used),
            brand:req.body.brand ? req.body.brand : null,
            delivery_from:req.body?.delivery_from,
            can_return:parseInt(req.body?.can_return),
            type_of_auction: req.body?.type_of_auction,
            start_time: req.body?.start_time,
            finish_time: req.body?.finish_time,
            request_time: new Date(),
            image_list: imageUrls,
            main_image: main_image,
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
                status: 2
            },
            {
                $set: {
                    admin_status: 11,
                    cancel_time: cancel_time,
                }
            })

        if (!product) {
            return res.status(500).json({message: 'Không tìm thấy sản phẩm đấu giá!'})
        }
        res.status(200).json({message: `Xóa sản phẩm đấu giá thành công`});

    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.updateStatusByAdmin = async (req, res) => {
    try {
        const newStatus = parseInt(req.body.newState)
        const productId = req.body?.product_id
        const status = req.body?.state
        const now = new Date()
        var product

        if (status === 5) {
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    admin_belong: 1
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.confirm_time': now
                    }
                })
        } else if (status === 6) {
            product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    admin_belong: 1
                },
                {
                    $set: {
                        status: newStatus,
                        'product_delivery.status': newStatus,
                        'product_delivery.delivery_start_time': now
                    }
                })
        }
        if (!product || product.status !== status) {
            return res.status(404).json({message: 'Product not found.'})
        }

        return res.status(200).json({message: 'Update success'})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}


exports.adminGetRequestHistory = async (req, res) => {
    try {

        const start_time = req.query?.start_time
        const finish_time = req.query?.finish_time
        const phone = req.query?.phone
        const df = req.query?.df
        let requests

        if (df === 'true') {
            requests = await Request.find({
                seller_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                }
            }).select('_id createdAt product_name status rank').populate('seller_id', 'phone name')
        } else if (phone) {
            requests = await Request.find({
                createdAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                seller_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                }
            }).select('_id createdAt product_name status rank').populate('seller_id', 'phone name')
        } else {
            requests = await Request.find({
                createdAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                }
            }).select(' _id createdAt product_name status rank').populate('seller_id', 'phone name')
        }

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


exports.adminGetAuctionHistoryList = async (req, res) => {
    try {
        const start_time = req.query?.start_time
        const finish_time = req.query?.finish_time
        const phone = req.query?.phone
        const df = req.query?.df
        let products

        if (df === 'true') {
            products = await Product.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: {$exists: false},
            }).select('_id product_name status start_time finish_time').populate('seller_id', 'name')
        } else if (phone) {
            products = await Product.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: {$exists: false},
            }).select('_id product_name status start_time finish_time').populate('seller_id', 'name')
        } else {
            products = await Product.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: {$exists: false},
            }).select(' _id product_name status start_time finish_time').populate('seller_id', 'name')
        }

        const total = {
            total_product: products.length,
            total_completed: products.filter((req) => req.status === 8).length,
            total_failure: products.filter((req) => req.status === 10).length,
            total_canceled: products.filter((req) => req.status === 11).length,
            total_returned: products.filter((req) => req.status === 14).length,
        }

        res.status(200).json({products, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminGetRequestHistoryDetail = async (req, res) => {
    try {

        const requestId = req.params.requestId

        const request = await Request.findOne({
            _id: new mongoose.Types.ObjectId(requestId),
            admin_belong: {$exists: false},
        }).populate('seller_id category_id', 'point average_rating name phone')


        res.status(200).json(request)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminGetAdminAuctionCompletedList = async (req, res) => {
    try {
        const start_time = req.query?.start_time
        const finish_time = req.query?.finish_time
        const phone = req.query?.phone
        const df = req.query?.df
        let products

        if (df === 'true') {
            products = await Product.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select('_id product_name status start_time finish_time')
        } else if (phone) {
            products = await Product.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select('_id product_name status start_time finish_time')
        } else {
            products = await Product.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select(' _id product_name status start_time finish_time')
        }

        const total = {
            total_product: products.length,
            total_completed: products.filter((req) => req.status === 8).length,
            total_failure: products.filter((req) => req.status === 10).length,
            total_canceled: products.filter((req) => req.status === 11).length,
            total_returned: products.filter((req) => req.status === 14).length,
        }

        res.status(200).json({products, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminAuctionCompletedDetail = async (req, res) => {
    try {
        const requestId = req.params.requestId

        const request = await Product.findOne({
            _id: new mongoose.Types.ObjectId(requestId),
            admin_belong: 1
        }).populate('winner_id category_id', 'phone name')

        res.status(200).json({...request._doc})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.adminGetProductReturnOfUser = async (req, res) => {
    try {
        const start_time = req.query?.start_time
        const finish_time = req.query?.finish_time
        const phone = req.query?.phone
        const df = req.query?.df
        let returnProducts

        if (df === 'true') {
            returnProducts = await Product.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: {$exists: false},
            }).select('_id product_name status product_delivery.return_time')
                .populate('seller_id', 'name')
                .populate('winner_id','name phone')
        } else if (phone) {
            returnProducts = await Product.find({
                'product_delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: {$exists: false},
            }).select('_id product_name status product_delivery.return_time')
                .populate('seller_id', 'name')
                .populate('winner_id','name phone')
        } else {
            returnProducts = await Product.find({
                'product_delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: 9,
                admin_belong: {$exists: false},
            }).select(' _id product_name status product_delivery.return_time')
                .populate('seller_id', 'name')
                .populate('winner_id','name phone')
        }

        const total = {
            total_reqReturn: returnProducts.length,
        }

        res.status(200).json({returnProducts, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminGetProductReturnOfAdmin = async (req, res) => {
    try {
        const start_time = req.query?.start_time
        const finish_time = req.query?.finish_time
        const phone = req.query?.phone
        const df = req.query?.df
        let returnProducts

        if (df === 'true') {
            returnProducts = await Product.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 1,
            }).select('_id product_name status product_delivery.return_time')
                .populate('winner_id','name phone')
        } else if (phone) {
            returnProducts = await Product.find({
                'product_delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 1,
            }).select('_id product_name status product_delivery.return_time')
                .populate('winner_id','name phone')
        } else {
            returnProducts = await Product.find({
                'product_delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: 9,
                admin_belong: 1,
            }).select(' _id product_name status product_delivery.return_time')
                .populate('winner_id','name phone')
        }

        const total = {
            total_reqReturn: returnProducts.length,
        }

        res.status(200).json({returnProducts, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.acceptReturnProduct = async (req, res) => {
    try {

        const productId = req.body?.product_id
        const product = await Product.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(productId),
                    status: 9
                },
                {
                    $set: {
                        status: 14,
                        'product_delivery.status': 14,
                        'product_delivery.approve_return_time': new Date()
                    }
                })

        if (!product || product.status !== 9) {
            return res.status(404).json({message: 'Product not found.'})
        }

        return res.status(200).json({message: 'Update success'})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.denyReturnProduct = async (req, res) => {
    try {
        const productId = req.body?.product_id
        const product = await Product.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(productId),
                status: 9
            },
            {
                $set: {
                    status: 15,
                    'product_delivery.status': 15,
                    'product_delivery.deny_return_time': new Date()
                }
            })

        if (!product || product.status !== 9) {
            return res.status(404).json({message: 'Product not found.'})
        }

        return res.status(200).json({message: 'Update success'})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.createBlog = async (req, res) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const adminId = req.userId
        if (!req.files || req.files.length === 0) {
            return res.status(500).send({message: "Please upload at least one file!"});
        }
        console.log(req.files)

        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile[]'][0].buffer);
        });

        const rs = await uploadMainImagePromise;
        const main_image = rs.url

        const uploadMainImagePromise1 = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile_sub[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile_sub[]'][0].buffer);
        });
        const rs1 = await uploadMainImagePromise1;
        const sub_image = rs1.url

        const blog = new Blog({
            author:new mongoose.Types.ObjectId(adminId),
            title: req.body?.title,
            content: req.body?.content,
            subtitle1:req.body?.subtitle1,
            subtitle2:req.body.subtitle2 ? req.body.subtitle2 : null,
            subtitle3:req.body.subtitle3 ? req.body.subtitle3 : null,
            sub_image: sub_image,
            image:main_image
        })
        await blog.save();

        res.status(200).json(blog)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.createCategory = async (req, res) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const adminId = req.userId
        if (!req.files || req.files.length === 0) {
            return res.status(500).send({message: "Please upload at least one file!"});
        }
        console.log(req.files)

        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile[]'][0].buffer);
        });

        const rs = await uploadMainImagePromise;
        const main_image = rs.url

        const category = new Categories({
            name: req.body?.name,
            image:main_image,
        })
        await category.save();

        res.status(200).json(category)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getCategories = async (req, res) => {
    try {
         const categories = await Categories.find({
             parent: {$eq: null, $exists: true},

            })
        res.status(200).json({categories})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.createChildCategory = async (req, res) => {
    try {
        const parentId = req.params.id
        const category = new Categories({
            name: req.body?.name,
            parent : new mongoose.Types.ObjectId(parentId)
        })
        await category.save();

        res.status(200).json(category)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.getCategoriesChild = async (req, res) => {
    try {
        const parentID = req.params.id
        const categories = await Categories.find({
            parent: new mongoose.Types.ObjectId(parentID),
        })
        res.status(200).json({categories})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.getcategoryParent = async (req, res) => {
    try {
        const parentID = req.params.id
        const categories = await Categories.find({
            _id: new mongoose.Types.ObjectId(parentID),
        })
        res.status(200).json({categories})
    } catch (error) {
        res.status(500).json({message: 'Internal server error' + error})
    }
}

exports.editCategory = async (req, res) => {
    try {
        let category
        if(req.body.status === 0 || req.body.status === 1 ){
             category = await Categories.findOneAndUpdate({
                _id :  new mongoose.Types.ObjectId(req.body?.category_id) ,
            },{
                $set : {
                    status : req.body?.status
                }
            })
        }else if(req.body.name){
            category = await Categories.findOneAndUpdate({
                _id :  new mongoose.Types.ObjectId(req.body?.category_id) ,
            },{
                $set : {
                    name : req.body?.name
                }
            })
        }

        res.status(200).json(category)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.deleteCategory = async (req, res) => {
    try {
         if(!req.params.id)   {
             return  res.status(404).json({message : 'Không tìm thấy danh mục sản phẩm'})
         }
         await Categories.findOneAndDelete({
                _id :  new mongoose.Types.ObjectId(req.params.id) ,
            })
        res.status(200).json({message : ' Thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
