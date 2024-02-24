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
module.exports = {
    startBiddingJob,startFinishBiddingJob
};
