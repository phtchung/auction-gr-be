const express = require('express')
const cors = require('cors')
const db = require('./app/db')
const {startBiddingJob, startUpdateDeliveryJob, cancelDeliveryJob,} = require("./cronjob");
const {app, server,io} = require("./app/socket/socket");
require('dotenv').config()

// var usersRouter = require('./app/routes/user.routes');

app.use(cors())

// parse requests of content-type - application/json
app.use(express.json())

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true}))

app.use((error, req, res, next) => {
    console.log('This is the rejected field ->', error.field)
})

app.get('/', (req, res) => {
    res.json({message: 'Welcome to  application.'})
})

// routes
require('./app/routes/auth.routes')(app)
require('./app/routes/admin.routes')(app)
require('./app/routes/user.routes')(app)
require('./app/routes/product.routes')(app)
require('./app/routes/request.routes')(app)
require('./app/routes/delivery.routes')(app)
require('./app/routes/auction.routes')(app)
require('./app/routes/blog.routes')(app)
require('./app/routes/review.routes')(app)
require('./app/routes/sse.routes')(app)
require('./app/routes/notification.routes')(app)

// app.use('/', sseRoute);

startBiddingJob()
startUpdateDeliveryJob()
cancelDeliveryJob()


// set port, listen for requests
const PORT = 8088
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`)
})


