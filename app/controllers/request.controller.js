const User = require('../models/user.model')
const Request = require('../models/request.model')
const mongoose = require('mongoose')

exports.getRequest = async (req,res) =>{
    try{
        const userId = req.userId
        const start_time = req.query.start_time
        const finish_time = req.query.finish_time
        console.log(req)

        const requests = await Request.find({ seller_id: new mongoose.Types.ObjectId(userId),
            createdAt: {
                $gte: new Date(start_time),
                $lte: new Date(finish_time)
            }}).select(' _id createdAt product_name status rank')

        const total = {
            total_request: requests.length,
            total_pending: requests.filter(req => req.status === 1).length,
            total_approved : requests.filter(req => req.status === 2).length,
            total_rejected: requests.filter(req => req.status === 13).length,

        }
        console.log(total)
        res.status(200).json({requests,total})
    }catch (err){
        return res.status(500).json({ message: 'DATABASE_ERROR' ,err})
    }
}
