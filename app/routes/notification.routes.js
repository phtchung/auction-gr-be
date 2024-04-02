const { authJwt } = require('../middlewares')
const controller = require('../controllers/notification.controller')

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
        next()
    })

    app.post('/notification', [authJwt.verifyToken], controller.getNotifications)

    app.post('/notification/count', [authJwt.verifyToken], controller.getCountNotifications)

}
