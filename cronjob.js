const cron = require('node-cron');
const Product = require("./app/models/product.model");


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

// finish đấu giá nhưng bị fail ko ai mua
const updateFinishBiddingProduct = async () => {
    const currentTime = new Date();

    // Cập nhật trường status
    await Product.updateMany(
        {
            status: 3,
            finish_time: { $lt: currentTime },
            final_price: { $exists: false },
            winner_id: { $exists: false }
        },
        { $set: { status: 10 } },
    );
};


const startFinishBiddingJob = () => {
    const job1 = new cron.schedule(
        '* * * * *', async function() {
            await updateFinishBiddingProduct();
        });

    job1.start();
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

module.exports = {
    startBiddingJob
};
