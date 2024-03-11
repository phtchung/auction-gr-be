const config = require('../config/auth.config')
const db = require('../models')
const User = db.user
const Role = db.role

var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')

exports.signup = (req, res) => {
  const user = new User({
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8),
    name: req.body.name,
    username: req.body.username,
    point: req.body.point,
    phone: req.body.phone,
    active: req.body.active,
    gender: req.body.gender
  })

  user
    .save()
    .then((savedUser) => {
      if (req.body.roles) {
        if (req.body.roles === 'admin') {
          res.status(500).send({ message: 'Can not sign up with admin' })
        }
        Role.find({ name: { $in: req.body.roles } })
          .then((roles) => {
            user.roles = roles.map((role) => role._id)
            user.save()
            res.send({ message: 'User was registered successfully!' })
          })
          .catch((err) => {
            res.status(500).send({ message: err })
          })
      } else {
        Role.findOne({ name: 'user' })
          .then((role) => {
            user.roles = [role._id]
            user.save()
            res.send({ message: 'User was registered successfully!' })
          })
          .catch((err) => {
            res.status(500).send({ message: err })
          })
      }
    })
    .catch((err) => {
      res.status(500).send({ message: err })
    })
}

exports.signin = (req, res) => {
  User.findOne({
    email: req.body.email
  })
    .populate('roles', '-__v')
    .then((user) => {
      if (!user || user.roles[0].name !== 'user') {
        return res.status(404).send({ message: 'Email Not found.' })
      }

      var passwordIsValid = bcrypt.compareSync(req.body.password, user.password)

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: 'Invalid Password!'
        })
      }

      const token = jwt.sign({ id: user.id,username:user.username }, config.secret, {
        algorithm: 'HS256',
        allowInsecureKeySizes: true,
        expiresIn: 86400 // 24 hours
      })

      var authorities = user.roles.map((role) => 'ROLE_' + role.name.toUpperCase())

      res.status(200).send({
        id: user._id,
        email: user.email,
        roles: authorities,
        accessToken: token
      })
    })
    .catch((err) => {
      res.status(500).send({ message: err })
    })
}

exports.adminSignin = (req, res) => {
    User.findOne({
        email: req.body.email
    })
        .populate('roles', '-__v')
        .then((user) => {
            if (!user || user.roles[0].name !== 'admin') {
                return res.status(404).send({ message: 'Email not found.' })
            }
            var passwordIsValid = bcrypt.compareSync(req.body.password, user.password)

            if (!passwordIsValid) {
                return res.status(401).send({
                    accessToken: null,
                    message: 'Invalid Password!'
                })
            }

            const token = jwt.sign({ id: user.id }, config.secret, {
                algorithm: 'HS256',
                allowInsecureKeySizes: true,
                expiresIn: 86400 // 24 hours
            })

            var authorities = user.roles.map((role) => 'ROLE_' + role.name.toUpperCase())

            res.status(200).send({
                id: user._id,
                email: user.email,
                roles: authorities,
                accessToken: token
            })
        })
        .catch((err) => {
            res.status(500).send({ message: err })
        })
}
