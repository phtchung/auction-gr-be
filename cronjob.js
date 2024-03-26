const cron = require('node-cron');
const Product = require("./app/models/product.model");
const User = require("./app/models/user.model");


const updateBiddingProduct = async () => {
    const currentTime = new Date();

    // Cập nhật trường status
    await Product.updateMany(
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

const doneDelivery = async () => {
     await Product.updateMany(
        {
            status: 7,
            'product_delivery.delivery_start_time': { $lt : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
            'product_delivery.completed_time': { $exists: false }
        },
        [
            {
                $set: {
                    status: 8,
                    'product_delivery.status': 8,
                    'product_delivery.completed_time': new Date(),
                    is_review:0,
                    review_before: { $add: ["$victory_time", 20 * 24 * 60 * 60 * 1000] },
                }
            }
        ]
    );
    const updatedProducts = await Product.find({
        status: 8,
        'product_delivery.delivery_start_time': { $lt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)},
        get_point : 0
    });

    await User.updateMany({
            _id: { $in: updatedProducts.map(product => product.seller_id) },
                },
        { $inc: { point: 100 } }
    );
    await Product.updateMany({
            _id: { $in: updatedProducts.map(product => product._id) },
        },
        { get_point: 1 }
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
    await Product.updateMany(
        {
            status: 4,
            isDeliInfor:0,
            procedure_complete_time: { $lt : new Date() },
            product_delivery: { $exists: false }
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

};

const cancelDeliveryJob = () => {
    const job5 = new cron.schedule(
        '* * * * *', async function() {
            await cancelDelivery();
        });
    job5.start();
};

module.exports = {
    startBiddingJob,startUpdateDeliveryJob,cancelDeliveryJob
};
