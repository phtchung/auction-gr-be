const cron = require('node-cron');
const Product = require("./app/models/product.model");
const User = require("./app/models/user.model");
const Auction = require("./app/models/auction.model");
const Notification = require("./app/models/notification.model");
const {formatDateTime} = require("./app/utils/constant");
const sse = require("./app/sse");

// update trạng thái sản phẩm ( chuyển sang đấu giá )
const updateBiddingProduct = async () => {
    const currentTime = new Date();

    // Cập nhật trường status
    await Auction.updateMany(
        {
            status: 2,
            start_time: { $lt: currentTime }
        },
        { $set: { status: 3 } }
    );

};

const startBiddingJob = () => {
    const job = new cron.schedule(
        '* * * * *', async function() {
        await updateBiddingProduct();
    });
    job.start();
};

// update finish khi có ng thám gia rồi
const updateFinishSuccessAuction = async () => {
    const currentTime = new Date();
    await Product.updateMany(
        {
            status: 3,
            finish_time: {$lt: currentTime, $exists: true},
            final_price: { $exists: true },
            winner_id: { $exists: true }
        },
        [
            {
                $set: {
                    status: 4,
                    victory_time: "$finish_time",
                    'delivery.procedure_complete_time': { $add: ["$finish_time", 2 * 24 * 60 * 60 * 1000] },

                }
            }
        ]
    );
};
const startFinishSuccessAuctionJob = () => {
    const job2 = new cron.schedule(
        '* * * * *', async function() {
            await updateFinishSuccessAuction();
        });

    job2.start();
};

// tự động hopoanf thành sau 10 ngày
const doneDelivery = async () => {
     await Auction.updateMany(
        {
            status: 7,
            'delivery.delivery_start_time': { $lt : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
            'delivery.completed_time': { $exists: false }
        },
        [
            {
                $set: {
                    status: 8,
                    'delivery.status': 8,
                    'delivery.completed_time': new Date(),
                    is_review:0,
                    review_before: { $add: ["$victory_time", 30 * 24 * 60 * 60 * 1000] },
                }
            }
        ]
    );

};
const startUpdateDeliveryJob = () => {
    const job4 = new cron.schedule(
        '0 0,12 * * *', async function() {
            await doneDelivery();
        });
    job4.start();
};

// hủy đơn khi quá hạn điền thông tin
const cancelDelivery = async () => {
    const rs = await Auction.updateMany(
        {
            status: 4,
            'delivery.procedure_complete_time': { $lt : new Date() },
        },
        [
            {
                $set: {
                    status: 11,
                    cancel_time:new Date(),
                    'delivery.status':11
                }
            }
        ]
    );
//     còn đoạn trừ điểm người dùng nữa
    if(rs.modifiedCount > 0 ){
        const canceledOrders = await Auction.find({
            status: 11,
            'delivery.payment_method':{ $exists: false },
            cancel_time: { $exists: true }
        }).sort({ updatedAt: -1 }).limit(rs.modifiedCount)
            .populate('winner_id seller_id','_id');

        for (const order of canceledOrders) {
            let user = await User.findOneAndUpdate(
                { _id: order.winner_id._id },
                { $inc: { point: -35 } }
            );
            if(user.point <= 0){
                user.active = false
                await user.save();
            }
            const data = new Notification ({
                title : 'Đơn hàng bị hủy',
                content : `Đơn hàng #${order._id.toString()} vừa bị hủy vì người thắng không hoàn thành thủ tục nhận hàng.`,
                url :`/reqOrderTracking/reqOrderDetail/${order._id.toString()}?status=11`,
                type : 1,
                receiver : [order.seller_id._id],
            })
            const data1 = new Notification ({
                title : 'Đơn hàng bị hủy',
                content : `Đơn hàng #${order._id.toString()} vừa bị hủy vì bạn không hoàn thành thủ tục nhận hàng, tài khoản bị trừ 35 điểm`,
                url :`/winOrderTracking/winOrderDetail/${order._id.toString()}?status=11`,
                type : 1,
                receiver : [order.winner_id._id],
            })
            await data.save()
            await data1.save()
            sse.send( data1, `cancelProduct_${order.winner_id._id.toString()}`);
            sse.send( data, `cancelProduct_${order.seller_id._id.toString()}`);
        }
    }
};

const cancelDeliveryJob = () => {
    const job5 = new cron.schedule(
        '0 0,12 * * *', async function() {
            await cancelDelivery();
        });
    job5.start();
};


const NotifyConfirmDelivery = async () => {
    const rs1 = await Auction.updateMany(
        {
            status: 5,
            'delivery.delivery_before': { $lt : new Date() },
        },
        [
            {
                $set: {
                    status: 11,
                    cancel_time:new Date(),
                    'delivery.status':11
                }
            }
        ]
    );

//     còn đoạn trừ điểm người dùng nữa
    if(rs1.modifiedCount > 0 ){
        const canceledOrders = await Auction.find({
            status: 11,
            'delivery.payment_method' : { $exists: true },
            cancel_time: { $exists: true }
        }).sort({ updatedAt: -1 }).limit(rs1.modifiedCount)
            .populate('seller_id','_id');

        for (const order of canceledOrders) {
            let user = await User.findOneAndUpdate(
                { _id: order.seller_id._id },
                { $inc: { shop_point: -20 } }
            );

            if(user.shop_point <= 0){
                user.active = false
                await user.save();
            }
            const data = new Notification ({
                title : 'Đơn hàng bị hủy',
                content : `Đơn hàng #${order._id.toString()} vừa bị hủy vì người bán không giao sản phẩm đúng thời hạn.`,
                url :`/winOrderTracking/winOrderDetail/${order._id.toString()}?status=11`,
                type : 1,
                receiver : [order.winner_id._id],
            })
            const data1 = new Notification ({
                title : 'Đơn hàng bị hủy',
                content : `Đơn hàng #${order._id.toString()} vừa bị hủy vì bạn không giao hàng đúng thời hạn, tài khoản bán hàng bị trừ 20 điểm`,
                url :`/reqOrderTracking/reqOrderDetail/${order._id.toString()}?status=11`,
                type : 1,
                receiver : [order.seller_id._id],
            })
            await data.save()
            await data1.save()
            sse.send( data1, `cancelProduct_${order.seller_id._id.toString()}`);
            sse.send( data, `cancelProduct_${order.winner_id._id.toString()}`);
        }
    }
};

const NotifyConfirmDeliveryJob = () => {
    const job6 = new cron.schedule(
        '* * * * *', async function() {
            await NotifyConfirmDelivery();
        });
    job6.start();
};


module.exports = {
    startBiddingJob,startUpdateDeliveryJob,cancelDeliveryJob,NotifyConfirmDeliveryJob
};
