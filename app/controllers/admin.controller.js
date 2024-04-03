const {mongoose} = require('mongoose')
const Product = require("../models/product.model");
const Request = require("../models/request.model");
const Delivery = require("../models/delivery.model");
const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const {adminProductStatus, adminRequestStatus,
    createTitleWinner,
    createContentWinner,
    createTitleSeller,
    createContentSeller, formatDateTime
} = require("../utils/constant");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Blog = require("../models/blog.model");
const Categories = require("../models/category.model");
const sse = require("../sse/index")
const {createBlog} = require("../service/blog.service");
const {adminApproveAuction, adminRejectRequest, acceptReturnProduct, denyReturnProduct, updateStatusByAdmin} = require("../service/admin.service");
const Notification = require("../models/notification.model");
const {da} = require("@faker-js/faker");

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


exports.adminApproveAuctionController = async (req, res) => {
    const result = await adminApproveAuction(req);
    res.status(result.statusCode).json(result);
    if (!result.error) {
        const data = new Notification ({
            title : 'Yêu cầu được duyệt',
            content : `Yêu cầu #${result.data.request_id.toString()} vừa được quản trị viên phê duyệt .Sản phẩm sẽ được đấu giá vào lúc ${formatDateTime(result.data.start_time)}`,
            url :`/reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=2`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await data.save()
        sse.send( data, `approveProduct_${result.data.seller_id.toString()}`);
    }
}

exports.adminRejectRequestController = async (req, res) => {
    const result = await adminRejectRequest(req);
    res.status(result.statusCode).json({message : 'Từ chối yêu cầu thành công'});
    if (!result.error) {
        const data = new Notification ({
            title : 'Từ chối yêu cầu',
            content : `Yêu cầu đấu giá #${result.data._id.toString()} của bạn chưa được phê duyệt!`,
            url :`/reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=13`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await data.save()
        sse.send( data, `rejectProduct_${result.data.seller_id.toString()}`);
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

exports.updateStatusByAdminController = async (req, res) => {
    const result = await updateStatusByAdmin(req);
    res.status(result.statusCode).json({message:'Update success'});
    if (!result.error) {
        const dataForWinner = new Notification({
            title : createTitleWinner(result.status),
            content : createContentWinner(result.status ,result.data._id.toString()),
            url :`/winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=${result.status}`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await dataForWinner.save()
        sse.send( dataForWinner, `updateStatus_${result.data.winner_id.toString()}`);
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

exports.acceptReturnProductController = async (req, res) => {
    const result = await acceptReturnProduct(req);
    res.status(result.statusCode).json(result.message);
    if (!result.error) {
        const dataForWinner = new Notification({
            title : 'Trả hàng thành công',
            content : `Yêu cầu trả hàng #${result.data._id.toString()} đã được phê duyệt bởi quản trị viên. Sản phẩm sẽ được trả lại cho người bán.`,
            url :`/winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=14`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await dataForWinner.save()
        const dataForSeller = new Notification({
            title : 'Yêu cầu trả hàng',
            content : `Đơn hàng #${result.data._id.toString()} sẽ được trả lại trong vài ngày tới.`,
            url :`reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=14`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await dataForSeller.save()
        sse.send( dataForWinner, `acceptReturnWinner_${result.data.winner_id.toString()}`);
        sse.send( dataForSeller, `acceptReturnSeller_${result.data.seller_id.toString()}`);
    }
}

exports.denyReturnProductController = async (req, res) => {
    const result = await denyReturnProduct(req);
    res.status(result.statusCode).json(result.message);
    if (!result.error) {
        const dataForWinner = new Notification ({
            title : 'Yêu cầu trả hàng',
            content : `Rất tiếc, yêu cầu trả hàng #${result.data._id.toString()} đã bị từ chối.`,
            url :`/winOrderTracking/winOrderDetail/${result.data._id.toString()}?status=15`,
            type : 1,
            receiver : [result.data.winner_id],
        })
        await dataForWinner.save()
        const dataForSeller = new Notification({
            title : 'Yêu cầu trả hàng',
            content : `Quản trị viên từ chối trả lại sản phẩm của đơn hàng #${result.data._id.toString()}.`,
            url :`reqOrderTracking/reqOrderDetail/${result.data._id.toString()}?status=15`,
            type : 1,
            receiver : [result.data.seller_id],
        })
        await dataForSeller.save()
        sse.send( dataForWinner, `denyReturnWinner_${result.data.winner_id.toString()}`);
        sse.send( dataForSeller, `denyReturnSeller_${result.data.seller_id.toString()}`);
    }
}

exports.createBlogController = async (req, res) => {
    const result = await createBlog(req);
    res.status(result.statusCode).json(result);
    if (!result.error) {
        const data = new Notification({
            title : 'Bài viết mới',
            content : `Bài đăng ${result.data[0].title} vừa được ra mắt`,
            url :`/articles/news/${result.data[0]._id}`,
            type : 0,
            receiver : [],
        })
        await data.save()
        sse.send( data, "newBlog");
    }
};

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
