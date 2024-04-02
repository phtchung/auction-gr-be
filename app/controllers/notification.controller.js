const mongoose = require('mongoose')
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const {getNotifyStatus} = require("../utils/constant");

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.body.userId
        const user = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId)
        })
       if(user){
            const notifications = await Notification.find({
                $or: [
                    { type: 0 },
                    {
                        $and: [
                            { type: 1 },
                            { receiver: { $elemMatch: { $eq: userId } } }
                        ]
                    }
                ],
                createdAt : {$lt : new Date()}
            }).sort({ createdAt: -1 }).limit(20)

            return res.status(200).json({list : notifications,message : 'Success'})
        }else {
            return res.status(404).json({message: 'Không tìm thấy người dùng.'})
        }
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}


exports.getCountNotifications = async (req, res) => {
    try {
        const userId = req.body.userId
        const status = getNotifyStatus(req.body?.status)

        const user = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId)
        })
        if(status && status === 1){
            await User.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(userId)
                },
                {
                    $set: {
                        last_seen:new Date()
                    }
                })
            return res.status(200).json({total : 0})
        }
        if(user && user.last_seen){
            const count = await Notification.countDocuments({
                $or: [
                    { type: 0 },
                    {
                        $and: [
                            { type: 1 },
                            { receiver: { $elemMatch: { $eq: userId } } }
                        ]
                    }
                ],
                createdAt : {$lt : new Date() , $gt : user.last_seen}
            });
            return res.status(200).json({total :count})
        }else if(user && !user.last_seen) {
            const count = await Notification.countDocuments({
                $or: [
                    { type: 0 },
                    {
                        $and: [
                            { type: 1 },
                            { receiver: { $elemMatch: { $eq: userId } } }
                        ]
                    }
                ],
                createdAt : {$lt : new Date()}
            })
            return res.status(200).json({ total : count})
        }else {
            return res.status(404).json({message: 'Không tìm thấy người dùng.'})
        }
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
