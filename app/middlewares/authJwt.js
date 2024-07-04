const jwt = require('jsonwebtoken')
const config = require('../config/auth.config.js')
const db = require('../models/index.js')
const mongoose = require("mongoose");
const User = db.user
const Role = db.role

verifyToken =  async (req, res, next) => {
  let token = req.headers['authorization'].split(' ')[1]
  if (!token) {
    return res.status(403).send({ message: 'No token provided!' })
  }
  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: 'Unauthorized!'
      })
    }
    req.userId = decoded.id
    let user = await User.findOne({
      _id : new mongoose.Types.ObjectId(req.userId)
    })
    if(!user.active){
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa." });
    }
    req.username = decoded.username
    next()
  })
}

isAdmin = (req, res, next) => {
  User.findById(req.userId)
    .exec()
    .then((user) => {
      if (!user) {
        return res.status(500).send({ message: 'User Not found.' })
      }

      return Role.find({
        _id: { $in: user.roles },
        name: 'admin'
      }).exec()
    })
    .then((roles) => {
      if (roles.length > 0) {
        next()
      } else {
        res.status(403).send({ message: 'Require Admin Role!' })
      }
    })
    .catch((err) => {
      res.status(500).send({ message: err })
    })
}

const authJwt = {
  verifyToken,
  isAdmin
}
module.exports = authJwt
