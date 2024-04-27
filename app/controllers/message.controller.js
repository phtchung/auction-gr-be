const mongoose = require('mongoose')
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const {io, getReceiverSocketId} = require("../socket/socket");

exports.sendMessage = async (req, res) => {
    try {
        const senderId = req.userId
        const { message } = req.body;
        const { id: receiverId } = req.params;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
            });
        }
        // update hết các tin nhắn trước thành read
        await Message.updateMany(
            {
                receiverId: req.userId,
                senderId: receiverId
            },
            {
                $set: { status: 1 }
            }
        );

        const newMessage = new Message({
            senderId,
            receiverId,
            message,
        });

        if (newMessage) {
            conversation.messages.push(newMessage._id);
        }

        await Promise.all([conversation.save(), newMessage.save()]);

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            // io.to(<socket_id>).emit() used to send events to specific client
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        return res.status(500).json({message: 'Internal Server error', err})
    }
}

exports.getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const senderId = req.userId

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, userToChatId] },
        }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

        await Message.updateMany(
            {
                receiverId: req.userId,
                senderId: userToChatId
            },
            {
                $set: { status: 1 }
            }
        );

        if (!conversation) return res.status(200).json([]);

        const messages = conversation.messages;

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
