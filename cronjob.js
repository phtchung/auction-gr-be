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

const updateDataAdmin = async () => {
    const currentTime = new Date();

    await Product.updateMany(
        {
            admin_status: { $in: ['N', '-N'] },
            start_time: { $lt: currentTime }
        },
        { $set: { admin_status: 'B' } }
    );

};
const startDataJob = () => {
    const job = new cron.schedule(
        '* * * * *', async function() {
        await updateDataUser();
    });

    job.start();
};
const startDataJobAdmin = () => {
    const job1 = new cron.schedule('* * * * *', async function() {
        await updateDataAdmin();
    });

    job1.start();
};

module.exports = {
    startDataJob,startDataJobAdmin
};
