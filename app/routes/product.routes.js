const { authJwt } = require('../middlewares')
const controller = require('../controllers/product.controller')

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.post('/product/history', [authJwt.verifyToken], controller.getAuctionHistory)

  app.get('/product/history/:productId', [authJwt.verifyToken], controller.getAuctionHistoryDetail)

  app.post('/sale/history', [authJwt.verifyToken], controller.getSaleHistory)

  app.post('/product/winOrderList', [authJwt.verifyToken], controller.getWinOrderList)


}
