const mongoose = require("mongoose");
const Delivery = require("../models/delivery.model");
const Product = require("../models/product.model");

exports.createDeliveryInfor = async (req, res) => {
    try {
        const userId = req.userId

        const product = await Product.findOne({
            _id:new mongoose.Types.ObjectId(req.body.product_id)
        })

        if(product.status === 4){
            const delivery = new Delivery({
                name: req.body.name,
                payment_method: req.body.payment_method,
                address: req.body.address,
                phone: req.body.phone,
                status: 5,
                note: req.body.note,
                _id:new mongoose.Types.ObjectId(req.body.product_id)
            })
            const newDlv = await delivery.save()
            delete newDlv._id
            const product = await Product.findOneAndUpdate({
                _id:new mongoose.Types.ObjectId(req.body.product_id)
            },{product_delivery : newDlv,status : 5}, { new: true })

             return res.status(200).json({message:'Thành công'})
        }
        res.status(404).json({ message: 'Không đủ điều kiện cập nhật', err })
    } catch (err) {
        return res.status(500).json({ message: 'DATABASE_ERROR', err })
    }
}
