const {authJwt} = require('../middlewares')
const controller = require('../controllers/product.controller')
const multer = require("multer");

const upload = multer();
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
        next()
    })

    app.post('/product/history', [authJwt.verifyToken], controller.getAuctionHistory)

    app.get('/product/history/:productId', [authJwt.verifyToken], controller.getAuctionHistoryDetail)

    app.post('/sale/history', [authJwt.verifyToken], controller.getSaleHistory)

    app.post('/product/winOrderList', [authJwt.verifyToken], controller.getWinOrderList)

    app.get('/product/winCount', [authJwt.verifyToken], controller.getWinCount)

    app.get('/product/win/:productId', [authJwt.verifyToken], controller.getWinOrderDetail)

    app.get('/product/reqCount', [authJwt.verifyToken], controller.getReqCount)

    app.post('/product/reqOrderList', [authJwt.verifyToken], controller.getRequestOrderList)

    app.get('/product/req/:productId', [authJwt.verifyToken], controller.getReqOrderDetail)

    app.post('/product/updateStatus', [authJwt.verifyToken], controller.updateByWinnerController)

    app.post('/user/returnProduct', [authJwt.verifyToken],upload.array('files[]',14), controller.UserReturnProduct)

    app.get('/auction/item/:productId', controller.getAuctionProductDetail)



}
