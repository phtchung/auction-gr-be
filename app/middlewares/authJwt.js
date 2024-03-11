const jwt = require('jsonwebtoken')
const config = require('../config/auth.config.js')
const db = require('../models/index.js')
const User = db.user
const Role = db.role

verifyToken = (req, res, next) => {
  let token = req.headers['authorization'].split(' ')[1]
  if (!token) {
    return res.status(403).send({ message: 'No token provided!' })
  }
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: 'Unauthorized!'
      })
    }
    req.userId = decoded.id
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
