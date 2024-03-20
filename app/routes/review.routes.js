const { authJwt } = require('../middlewares')
const controller = require('../controllers/review.controller')
const multer = require("multer");

const upload = multer();
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
        next()
    })

    app.post('/user/reviewProduct', [authJwt.verifyToken],upload.array('files[]',5), controller.UserReviewProduct)
}
