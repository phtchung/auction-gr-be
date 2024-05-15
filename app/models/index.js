const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const db = {}

db.mongoose = mongoose

db.user = require('./user.model')
db.role = require('./role.model')
db.product = require('./product.model')
db.review = require('./review.model')
db.category = require('./category.model')
db.request = require('./request.model')
db.auction = require('./auction.model')
db.bid = require('./bid.model')
db.blog = require('./blog.model')
db.notification = require('./notification.model')
db.message = require('./message.model')
db.conversation = require('./conversation.model')
db.registration = require('./registration.model')


db.ROLES = ['user', 'admin']

module.exports = db
