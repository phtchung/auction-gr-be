const cron = require('node-cron');
const Product = require("./app/models/product.model");


const updateDataUser = async () => {
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


const startDataJob = () => {
    const job = new cron.schedule(
        '* * * * *', async function() {
        await updateDataUser();
    });

    job.start();
};


module.exports = {
    startDataJob
};
