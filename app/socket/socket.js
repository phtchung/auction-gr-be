const express = require('express')
const app = express()
const {createServer} = require('node:http');
const {Server} = require('socket.io');
const Auction = require("../models/auction.model");
const schedule = require("node-schedule");
const {endAuctionNormal, endAuctionOnline} = require("../service/admin.service");
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
    },
});

exports.getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {}; // {userId: socketId}

const activeAuctions = {};
// { auctionId : { namespace : namespace , socketId : [] }

// Hàm để khởi tạo socket cho 1 phiên đấu giá
exports.initAuctionSocket = (auctionId) => {
    if (!activeAuctions[auctionId]) {
        // Tạo namespace socket cho phiên đấu giá
        const auctionNamespace = io.of(`/auction/${auctionId}`);

        activeAuctions[auctionId] = {namespace: auctionNamespace, socketId: []}

        // Xử lý sự kiện kết nối từ máy khách
        auctionNamespace.on('connection', (socket) => {
            const userId = socket.handshake.query.userId;
            if (!userId) {
                console.log("Authentication failed: No userId provided.");
                socket.disconnect(true);
                return;
            }
            if (!activeAuctions[auctionId].socketId.includes(socket.id)) {
                activeAuctions[auctionId].socketId.push(socket.id);
            }

            socket.on("disconnect", () => {
                console.log("user disconnected", socket.id, auctionId);
                if (activeAuctions[auctionId].socketId.length) {
                    const index = activeAuctions[auctionId].socketId.indexOf(socket.id);
                    if (index !== -1) {
                        activeAuctions[auctionId].socketId.splice(index, 1);
                    }
                } else {
                    activeAuctions[auctionId].socketId = []
                }
            });
        });

    } else {
        activeAuctions[auctionId].namespace.on('connection', (socket) => {
            const userId = socket.handshake.query.userId;
            if (!userId) {
                console.log("Authentication failed: No userId provided.");
                socket.disconnect(true);
                return;
            }
            if (!activeAuctions[auctionId].socketId.includes(socket.id)) {
                activeAuctions[auctionId].socketId.push(socket.id);
            }

            socket.on("disconnect", () => {
                console.log("user disconnected", socket.id, auctionId);
                if (activeAuctions[auctionId].socketId.length) {
                    const index = activeAuctions[auctionId].socketId.indexOf(socket.id);
                    if (index !== -1) {
                        activeAuctions[auctionId].socketId.splice(index, 1);
                    }
                } else {
                    activeAuctions[auctionId].socketId = []
                }
            });
        });
    }
};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId !== "undefined")
        userSocketMap[userId] = socket.id;

    // socket.on() is used to listen to the events. can be used both on client and server side
    socket.on("disconnect", () => {
        delete userSocketMap[userId];
    });
});
const auctions = {};
exports.initializeFunc = async () => {
    const auctionListOnGoing = await Auction.find({
        status : 3,
        finish_time: {$gt: new Date()},
        start_time : {$lt: new Date()},
    }).select('status finish_time')

    if(auctionListOnGoing){
        auctionListOnGoing.map((auc) => {
            const endTime = new Date(auc.finish_time);
            const auctionId = auc._id.toString()
            auctions[auctionId] = { time : endTime , job : null };

            if(auc.auction_live === 0){
                auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                    await endAuctionNormal(auctionId, auctions);
                });
            }else {
                auctions[auctionId].job = schedule.scheduleJob(endTime,async() => {
                    await endAuctionOnline(auctionId,auctions);
                });
            }
        })
    }
}

exports.auctions = auctions
exports.activeAuctions = activeAuctions
exports.app = app;
exports.io = io;
exports.server = server;
