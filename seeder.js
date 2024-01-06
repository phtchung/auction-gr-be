const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Auction = require('./app/models/auction.model'); // Update with your path to the seed model
const Product = require('./app/models/product.model'); // Update with your path to the plant model

require('./app/db/index')

async function seedData() {
    for(let i = 0; i < 10; i++) { // This will create 100 fake seeds and plants
        let productItem = new Product({
            winner_id: [new mongoose.Types.ObjectId('658d8d59ded725a37cb8924e'),new mongoose.Types.ObjectId('658ed6c300a80ce6b80ed846'),new mongoose.Types.ObjectId('65900f011ac7272c10308877') ].at(faker.number.int()%3),
            seller_id: [new mongoose.Types.ObjectId('658d8d59ded725a37cb8924e'),new mongoose.Types.ObjectId('658ed6c300a80ce6b80ed846'),new mongoose.Types.ObjectId('65900f011ac7272c10308877') ].at(faker.number.int()%3),
            product_name: faker.commerce.productName(),

            status: faker.number.int({ min: 1, max: 12 }),
            sale_price: faker.number.int(),
            reserve_price: faker.number.int(),
            step_price: faker.number.int(),
            final_price: faker.number.int(),
            shipping_fee: faker.number.int(),
            rank: faker.lorem.word(),
            type_of_auction:1,
            description: faker.lorem.sentence(),
            victory_time: faker.date.future(),
            procedure_complete_time: faker.date.future(),
            start_time: faker.date.past(),
            finish_time: faker.date.future(),
        });

        await productItem.save();

        for(let j=0; j < 10; j++) {
            let auction = new Auction({
                product_id: productItem._id,
                seller_id: [new mongoose.Types.ObjectId('658d8d59ded725a37cb8924e'),new mongoose.Types.ObjectId('658ed6c300a80ce6b80ed846'),new mongoose.Types.ObjectId('65900f011ac7272c10308877') ].at(faker.number.int()%3),
                bid_price: faker.number.int(),
                bid_time: faker.date.future(),
            });
            await auction.save();
        }
    }
    console.log('seeds and plants seeded');
    process.exit();
}

seedData();
