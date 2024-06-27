const {mongoose} = require('mongoose')
const Product = require("../models/product.model");
const Request = require("../models/request.model");
const {Storage} = require("@google-cloud/storage");
const schedule = require('node-schedule');
const {format} = require("util");
const {adminProductStatus, adminRequestStatus,
    createTitleWinner,
    createContentWinner,
    createContentSeller, formatDateTime, getNgayThangNam, parseTime
} = require("../utils/constant");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Blog = require("../models/blog.model");
const Categories = require("../models/category.model");
const sse = require("../sse/index")
const {createBlog} = require("../service/blog.service");
const {adminApproveAuction, adminRejectRequest, acceptReturnProduct, denyReturnProduct, updateStatusByAdmin,
    endAuctionNormal, endAuctionOnline
} = require("../service/admin.service");
const Notification = require("../models/notification.model");
const {customAlphabet} = require("nanoid");
const Auction = require("../models/auction.model");
const Registration = require("../models/registration.model");
const sendEmail = require("../utils/helper");
const {auctions} = require("../socket/socket");


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
        const countNewReq = await Request.countDocuments({status: 1, admin_belong: 0})

        const countApproved = await Auction.countDocuments({
            status: 2, admin_belong: 0
        })

        const countReject = await Request.countDocuments({
            status: 13, admin_belong: 0
        })

        const countCancel = await Auction.countDocuments({
            status: 11, admin_belong: 0
        })
        const countBidding = await Auction.countDocuments({
            status: 3, admin_belong: 0
        })
        const countReturn = await Auction.countDocuments({
            status: 9, admin_belong: 0
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

        if (status === 1 || status === 13) {
            adminRequestList = await Request.find({
                status: status
            }).populate('seller_id', 'username name phone')
                .populate('product_id')

        } else {
            adminRequestList = await Auction.find({
                status: status,
                admin_belong: 0
            }).populate('seller_id', 'username name phone')
                .populate('product_id')
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
            //này cần sửa fe nữa , admin bán thì k câần pupulate ng bán :)
            const adminBiddingList = await Auction.find({
                status: {$in: [3, 4]},
                admin_belong: 1
            }).populate('seller_id', 'username phone')

            return res.status(200).json({adminBiddingList, status})
        }
        const adminBiddingList = await Auction.find({
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
        const countNewProduct = await Auction.countDocuments(
            {status: 2, admin_belong: 1})

        const countProductBid = await Auction.countDocuments({
            status: {$in: [3, 4]}, admin_belong: 1
        })

        const countProductConfirm = await Auction.countDocuments({
            status: 6, admin_belong: 1
        })

        const countProductSuccess = await Auction.countDocuments({
            status: 5, admin_belong: 1
        })
        const countProductDelivery = await Auction.countDocuments({
            status: 7, admin_belong: 1
        })
        const countProductCompleted = await Auction.countDocuments({
            status: 8, admin_belong: 1
        })
        const countProductCancel = await Auction.countDocuments({
            status: 11, admin_belong: 1
        })
        const countProductFailure = await Auction.countDocuments({
            status: 10, admin_belong: 1
        })
        const countProductReturn = await Auction.countDocuments({
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

        const request = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(requestId)
        }).populate('winner_id category_id', 'phone name')
            .populate('seller_id', 'shop_point average_rating name product_done_count phone')
            .populate('product_id')
        if (!request) {
            const newReq = await Request.findOne({
                _id: new mongoose.Types.ObjectId(requestId)
            }).populate('seller_id category_id', 'shop_point product_done_count average_rating phone name')
                .populate('product_id')
            return res.status(200).json(newReq)
        }

            return res.status(200).json(request)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.adminApproveAuctionController = async (req, res) => {
    const result = await adminApproveAuction(req ,res, auctions);
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
        const seller_id = new mongoose.Types.ObjectId(req.userId)

        const {category ,description,product_name,rank,is_used,delivery_from,can_return,reserve_price,shipping_fee,step_price,min_price,auction_live,
            type_of_auction,start_time,finish_time} = req.body

        if(!category || !description || !product_name || !rank  || !delivery_from || !can_return || !reserve_price || !shipping_fee || !min_price || !step_price
            || !auction_live || !type_of_auction || !start_time || !finish_time || start_time > finish_time){
            return res.status(404).json({message : 'Chưa điền đủ thông tin cần thiết để mở phiên đấu giá '})
        }

        if (!req.files || req.files.length === 0) {
            return res.status(500).send({message: "Please upload at least one file!"});
        }
        //Single file
        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now()  + req.files['singlefile[]'][0].originalname);
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
            const blob = bucket.file('admin' + Date.now()  + file.originalname);
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
            category_id:new mongoose.Types.ObjectId(category),
            description: description,
            product_name: product_name,
            rank: rank,
            is_used : parseInt(is_used),
            brand:req.body.brand ? req.body.brand : null,
            delivery_from:delivery_from,
            can_return:parseInt(can_return),
            image_list: imageUrls,
            main_image: main_image,
        })
        await product.save();

        const auction = new Auction({
            product_id : product._id,
            category_id:new mongoose.Types.ObjectId(category),
            auction_name: product_name,
            reserve_price: parseInt(reserve_price),
            shipping_fee: parseInt(shipping_fee),
            step_price: parseInt(step_price),
            seller_id: seller_id,
            admin_belong: 1,
            auction_live : parseInt(auction_live),
            status: 2,
            type_of_auction: type_of_auction,
            start_time: new Date(new Date(start_time).getTime() - 7 * 60 * 60 * 1000),
            finish_time: new Date(new Date(finish_time).getTime() - 7 * 60 * 60 * 1000),
            request_time: new Date(),
            bids:[],
        })

        if(auction.auction_live === 0){
            const {sale_price} = req.body
            if(!sale_price){
                return res.status(404).json({message : 'Chưa điền đủ thông tin cần thiết để mở phiên đấu giá 2'})
            }else
            auction.sale_price = parseInt(sale_price)
        }

        if(auction.auction_live === 2){
            const {register_start,register_finish,deposit_price, min_price} = req.body

            if(!register_start || !register_finish || !min_price || !deposit_price || register_start > register_finish || parseInt(deposit_price) > parseInt(reserve_price))
            {
                return res.status(404).json({message : 'Chưa  đủ thông tin hoặc thông tin không hợp lệ để mở phiên đấu giá 3'})
            }
            auction.register_start = new Date(new Date(register_start).getTime() - 7 * 60 * 60 * 1000)
            auction.register_finish = new Date(new Date(register_finish).getTime() - 7 * 60 * 60 * 1000)
            auction.deposit_price = parseInt(deposit_price)
            auction.min_price = parseInt(min_price)
            const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5)
            auction.room_id = getNgayThangNam() + nanoid()
            auction.code_access = []
        }

        await auction.save();
        const endTime = new Date(auction.finish_time);
        const auctionId = auction._id.toString()

        auctions[auctionId] = { time : endTime , job : null };

        if(auction.auction_live === 0){
            auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                await endAuctionNormal(auctionId ,auctions );
            });
        }else {
            auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                await endAuctionOnline(auctionId, auctions);
            });
        }

        res.status(200).json(auction)
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminCancelProduct = async (req, res) => {
    try {
        const auction_id = req.body?.req_id
        const cancel_time = req.body?.reject_time

        const auction = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(auction_id),
                status: 2
            },
            {
                $set: {
                    status: 11,
                    cancel_time: new Date(),
                }
            })

        if (!auction) {
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
            }).select('_id createdAt status ').populate('seller_id', 'phone name')
                .populate('product_id')
        } else if (phone) {
            requests = await Request.find({
                createdAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                seller_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                }
            }).select('_id createdAt status ').populate('seller_id', 'phone name')
                .populate('product_id')
        } else {
            requests = await Request.find({
                createdAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                }
            }).select(' _id createdAt status ').populate('seller_id', 'phone name')
                .populate('product_id')
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
        let auctions

        if (df === 'true') {
            auctions = await Auction.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 0,
            }).select('_id status start_time finish_time').populate('seller_id product_id', 'name product_name')
        } else if (phone) {
            auctions = await Auction.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 0,
            }).select('_id status start_time finish_time').populate('seller_id product_id', 'name product_name')
        } else {
            auctions = await Auction.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 0,
            }).select(' _id status start_time finish_time').populate('seller_id product_id', 'name product_name')
        }

        const total = {
            total_product: auctions.length,
            total_completed: auctions.filter((req) => req.status === 8).length,
            total_failure: auctions.filter((req) => req.status === 10).length,
            total_canceled: auctions.filter((req) => req.status === 11).length,
            total_returned: auctions.filter((req) => req.status === 14).length,
        }

        res.status(200).json({auctions, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminGetRequestHistoryDetail = async (req, res) => {
    try {
        const requestId = req.params.requestId

        const request = await Request.findOne({
            _id: new mongoose.Types.ObjectId(requestId),
            admin_belong: 0,
        }).populate('seller_id category_id', 'shop_point average_rating name phone')
            .populate('product_id')

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
        let auctions

        if (df === 'true') {
            auctions = await Auction.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select('_id status start_time finish_time').populate('product_id','product_name')
        } else if (phone) {
            auctions = await Auction.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select('_id status start_time finish_time').populate('product_id','product_name')
        } else {
            auctions = await Auction.find({
                updatedAt: {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: {$in: [8, 10, 11, 14]},
                admin_belong: 1,
            }).select(' _id status start_time finish_time').populate('product_id','product_name')
        }

        const total = {
            total_product: auctions.length,
            total_completed: auctions.filter((req) => req.status === 8).length,
            total_failure: auctions.filter((req) => req.status === 10).length,
            total_canceled: auctions.filter((req) => req.status === 11).length,
            total_returned: auctions.filter((req) => req.status === 14).length,
        }

        res.status(200).json({auctions, total})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.adminAuctionCompletedDetail = async (req, res) => {
    try {
        const requestId = req.params.requestId

        const request = await Auction.findOne({
            _id: new mongoose.Types.ObjectId(requestId),
            admin_belong: 1
        }).populate('winner_id category_id', 'phone name')
            .populate('product_id')

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
            returnProducts = await Auction.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 0,
            }).select('_id status delivery.return_time')
                .populate('seller_id product_id', 'name product_name')
                .populate('winner_id','name phone')
        } else if (phone) {
            returnProducts = await Auction.find({
                'delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 0,
            }).select('_id status delivery.return_time')
                .populate('seller_id product_id', 'name product_name')
                .populate('winner_id','name phone')
        } else {
            returnProducts = await Auction.find({
                'delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: 9,
                admin_belong: 0,
            }).select(' _id status delivery.return_time')
                .populate('seller_id product_id', 'name product_name')
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
            returnProducts = await Auction.find({
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 1,
            }).select('_id status delivery.return_time')
                .populate('product_id', 'product_name')
                .populate('winner_id','name phone')
        } else if (phone) {
            returnProducts = await Auction.find({
                'delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                winner_id: {
                    $in: await User.find({phone: phone}).distinct('_id')
                },
                status: 9,
                admin_belong: 1,
            }).select('_id status delivery.return_time')
                .populate('product_id', 'product_name')
                .populate('winner_id','name phone')
        } else {
            returnProducts = await Auction.find({
                'delivery.return_time': {
                    $gte: new Date(start_time),
                    $lte: new Date(finish_time)
                },
                status: 9,
                admin_belong: 1,
            }).select(' _id status delivery.return_time')
                .populate('product_id', 'product_name')
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

exports.getUserStreamAuction = async (req, res) => {
    try {
        const {inFor, room } = req.query
        let data = []
        let query = {
            auction_live : 2,
            status : {$in : [2,3]}
        }
        //còn thiếu checkck finish time và start time
        let query1 = {}

        if(inFor){
            const user = await User.findOne({
                $or: [
                    { phone: { $regex: inFor, $options: 'i' } },
                    { username: { $regex: inFor, $options: 'i' } },
                    { email: { $regex: inFor, $options: 'i' } }
                ]
            }).select('_id');
            if(!user){
                return res.status(404).json({data : [], message : 'Không tìm thấy người dùng'})
            }else {
               query1.user_id = new mongoose.Types.ObjectId(user._id)
            }
        }
        if(room){
            query.room_id = { $regex: room, $options: 'i' }
        }

        const auction = await Auction.find(query)
            .select('_id')
        if(auction){
            const auctionIds = auction.map((auc) => auc._id)
            query1.auction_id =  {$in : auctionIds}

            data =  await Registration.find(query1)
                .populate('user_id','name phone email')
                .populate('auction_id','room_id')
        }

        res.status(200).json({data})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.ReSendCode = async (req, res) => {
    try {
        const {userId, auctionId} = req.body

        const user = await User.findOne({
            _id : new mongoose.Types.ObjectId(userId)
        }).select('email _id')

        if(!user){
            return res.status(404).json({message: 'Không tìm thấy người dùng'})
        }

        const code = await Registration.findOne({
            user_id: user._id,
            auction_id : new mongoose.Types.ObjectId(auctionId)
        }).populate({
                path: 'auction_id',
                select: 'product_id start_time',
                populate: {
                    path: 'product_id',
                    select: 'product_name'
                }
            });

        if(!code){
            return res.status(404).json({message: 'Người dùng chưa đăng kí phiên đấu giá này'})
        }

        await sendEmail(
            {email: user.email , productName : code?.auction_id?.product_id?.product_name,randomCode: code.code, startTime : formatDateTime(code?.auction_id?.start_time) })

        res.status(200).json({message:'Gửi lại email thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.sendCodeToAnotherEmail = async (req, res) => {
    try {
        const {email, userId, auctionId} = req.body
        console.log(email, auctionId)
        const code = await Registration.findOne({
            user_id:  new mongoose.Types.ObjectId(userId),
            auction_id : new mongoose.Types.ObjectId(auctionId)
        }).populate({
            path: 'auction_id',
            select: 'product_id start_time code_access',
            populate: {
                path: 'product_id',
                select: 'product_name'
            }
        });
        if(!code){
            return res.status(404).json({message: 'Người dùng chưa đăng kí phiên đấu giá này'})
        }

        await sendEmail(
            {email: email, productName : code?.auction_id?.product_id?.product_name,randomCode: code.code, startTime : formatDateTime(code?.auction_id?.start_time) })

        res.status(200).json({message:'Gửi lại email thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.getStreamAuctionTracking = async (req, res) => {
    try {
        const {state, room } = req.query
        let query = {
            auction_live : 2,
            status : {$in : [2,3]}
        }
        if(state){
            //subcribe
            if(state === 'S'){
                query.register_start = {$lt : new Date()}
                query.register_finish = {$gt : new Date()}
            }else if(state === 'O'){
                query.start_time = {$lt : new Date()}
                query.finish_time = {$gt : new Date()}
            }else if (state === 'R'){
                query.register_finish = {$lt : new Date()}
                query.start_time = {$gt : new Date()}
            }
        }else {
            query.$or = [
                {
                    $and: [
                        { register_start: { $lt: new Date() } },
                        { register_finish: { $gt: new Date() } }
                    ]
                },
                {
                    $and: [
                        { start_time: { $lt: new Date() } },
                        { finish_time: { $gt: new Date() } }
                    ]
                },
                {
                    $and: [
                        { register_finish: { $lt: new Date() } },
                        { start_time: { $gt: new Date() } }
                    ]
                }
            ];
        }
        if(room){
            query.room_id = { $regex: room, $options: 'i' }
        }

        const auction = await Auction.find(query)
            .select('_id url_stream room_id start_time finish_time register_finish code_access status')

        res.status(200).json({auction})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.setUrlStream = async (req, res) => {
    try {
        const {url_stream, auctionId} = req.body

        if(!url_stream || !auctionId){
            return res.status(404).json({message: 'Cài đặt thất bại'})
        }

        const auc = await Auction.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(auctionId)
            },
            {
                $set: {
                    url_stream : url_stream
                }
            }
        )
        if(!auc){
            return res.status(404).json({message: 'Cài đặt thất bại'})
        }
        res.status(200).json({message:'Gửi lại email thành công'})
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}

exports.deleteStreamAuction = async (req, res) => {
    try {
        if(!req.params.id)   {
            return  res.status(404).json({message : 'Không tìm thấy phiên đấu giá'})
        }

        const auc = await Auction.findOne({
            _id :  new mongoose.Types.ObjectId(req.params.id) ,
        }).select('product_id')

        if(!auc){
            return  res.status(404).json({message : 'Xóa thất bại'})
        }

        if(auc && auc.register_finish < new Date() && auc.start_time > new Date() && auc.code_access.length === 0){
            let rs = await Auction.deleteOne({
                _id : auc._id
            })
            if(rs.deletedCount === 1){
                await Product.findOneAndDelete({
                    _id :  auc.product_id
                })
                res.status(200).json({message : 'Xóa thành công'})
            }else {
                return  res.status(404).json({message : 'Xóa thất bại'})
            }
        }
        return  res.status(404).json({message : 'Xóa thất bại'})

    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
