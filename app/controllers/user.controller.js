const {mongoose} = require('mongoose')
const User = require('../models/user.model')
const Role = require('../models/role.model')
const Notification = require("../models/notification.model");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const Auction = require("../models/auction.model");
const Request = require("../models/request.model");

exports.allAccess = (req, res) => {
    res.status(200).send('Public Content.')
}

exports.userBoard = (req, res) => {
    res.status(200).send('User Content.')
}

exports.getMyProfile = async (req, res) => {
    try {
        // Lấy thông tin người dùng hiện tại từ JWT token đã xác thực
        const userId = req.userId

        // Sử dụng Mongoose để tìm người dùng dựa trên userId
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({message: 'User not found.'})
        }

        // Lấy danh sách các vai trò của người dùng
        const roles = await Role.find({_id: {$in: user.roles}})


        const AucW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 4
        })

        const DlvW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: {$in: [5, 6, 7]}
        })

        const ReW = await Auction.countDocuments({
            winner_id: new mongoose.Types.ObjectId(userId),
            status: 9
        })

        const count_penR = await Request.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 1
        })

        const count_appR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 2
        })

        const count_bidR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: { $in: [3, 4] },
        })

        const count_sucR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 5
        })

        const count_cfR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 6
        })

        const count_dlvR = await Auction.countDocuments({
            seller_id: new mongoose.Types.ObjectId(userId),
            status: 7
        })

        let checkBidding = 0
        if( AucW || DlvW || ReW || count_penR || count_appR || count_dlvR || count_cfR || count_sucR || count_bidR ){
            checkBidding = 1
        }

        // Loại bỏ mật khẩu khỏi thông tin người dùng
        const userData = {
            _id: user._id,
            email: user.email,
            name: user.name,
            roles: roles.map((role) => role.name),
            auction_deposit : user.auction_deposit,
            checkBidding : checkBidding
        }

        res.status(200).json(userData)
    } catch (error) {
        console.error(error)
        res.status(500).json({message: 'Internal server error'})
    }
}

exports.getUser = async (req, res) => {
    try {
        const userId = req.userId
        // Sử dụng Mongoose để tìm người dùng dựa trên userId
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({message: 'User not found.'})
        }

        const roles = await Role.find({_id: {$in: user.roles}})

        const userWithoutPassword = {
            _id: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            phone: user.phone,
            point: user.point,
            gender: user?.gender,
            date_of_birth: user?.date_of_birth,
            shop_point : user?.shop_point,
            receiveAuctionSuccessEmail : user.receiveAuctionSuccessEmail,
        }

        res.status(200).json(userWithoutPassword)
    } catch (error) {
        res.status(500).json({message: 'Internal server error'})
    }
}

exports.updateInfo = async (req, res) => {
    console.log(req.body)
    let userId = req.body.userId
    let receiveAuctionSuccessEmail  = req.body.receiveAuctionSuccessEmail
    console.log(receiveAuctionSuccessEmail)
    let birthday = req.body.date_of_birth || null
    let gender = req.body.gender !== undefined ? req.body.gender : null

    // if (birthday === null && gender === null) {
    //     return res.status(400).json({message: 'BAD_REQUEST'})
    // }
    try {
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({message: 'User not found.'})
        }
        if (birthday) {
            user.date_of_birth = birthday
        }

        if (gender !== null) {
            user.gender = gender
        }
        console.log('alo'.receiveAuctionSuccessEmail)

        user.receiveAuctionSuccessEmail = receiveAuctionSuccessEmail


        await user.save()

        return res.status(200).json({message: 'UPDATE_SUCCESS'})
    } catch (e) {
        console.log(e)
        return res.status(500).json({message: 'DATABASE_ERROR'})
    }
}

exports.getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.userId;
        const conversations = await Conversation.find({ participants: loggedInUserId })
            .populate({
            path: 'participants',
            select: '_id username'
        }).lean()

        let chatList = [];
        conversations.forEach(conversation => {
            conversation.participants.forEach(participant => {
                if (participant._id.toString() !== loggedInUserId) {
                    chatList.push(participant);
                }
            });
        });

        let idx = 0
        for (const rcvId of chatList) {
            let M = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            {senderId: new mongoose.Types.ObjectId(loggedInUserId), receiverId: rcvId._id},
                            {senderId: rcvId._id, receiverId: new mongoose.Types.ObjectId(loggedInUserId)}
                        ]
                    }
                },
                {
                    $sort: {createdAt: -1}
                },
                {
                    $limit: 1
                }
            ])

            if (M) {
                let lastM = M[0]
                chatList[idx] = {...chatList[idx], lastM};
            }
            idx++
        }
//init notify data
        let index = 0
        for (const rcvId of chatList) {
            let unReadM = await Message.countDocuments({
                receiverId: new mongoose.Types.ObjectId(loggedInUserId),
                senderId: rcvId._id,
                status: 0
            });
            chatList[index] = {...chatList[index], unReadM};
            index++
        }

        res.status(200).json(chatList);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};
