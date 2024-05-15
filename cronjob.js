const cron = require('node-cron');
const Product = require("./app/models/product.model");
const User = require("./app/models/user.model");
const Auction = require("./app/models/auction.model");

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
                    procedure_complete_time: { $add: ["$finish_time", 2 * 24 * 60 * 60 * 1000] },
                    isDeliInfor: 0,
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

// tự động hopoanf thành sau 7 ngày
const doneDelivery = async () => {
     await Auction.updateMany(
        {
            status: 7,
            'delivery.delivery_start_time': { $lt : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
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
            procedure_complete_time: { $lt : new Date() },
        },
        [
            {
                $set: {
                    status: 11,
                    cancel_time:new Date()
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
            .populate('winner_id','_id');

        for (const order of canceledOrders) {
            await User.updateOne(
                { _id: order.winner_id._id },
                { $inc: { point: -200 } }
            );
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
    const rs = await Auction.updateMany(
        {
            status: 5,
            delivery_before: { $lt : new Date() },
        },
        [
            {
                $set: {
                    status: 11,
                    cancel_time:new Date()
                }
            }
        ]
    );
//     còn đoạn trừ điểm người dùng nữa
    if(rs.modifiedCount > 0 ){
        const canceledOrders = await Auction.find({
            status: 11,
            'delivery.payment_method' : { $exists: true },
            cancel_time: { $exists: true }
        }).sort({ updatedAt: -1 }).limit(rs.modifiedCount)
            .populate('seller_id','_id');

        for (const order of canceledOrders) {
            await User.updateOne(
                { _id: order.seller_id._id },
                { $inc: { shop_point: -10 } }
            );
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
