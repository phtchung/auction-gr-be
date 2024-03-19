const { authJwt } = require('../middlewares')
const controller = require('../controllers/auction.controller')

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.get('/bidding', [authJwt.verifyToken], controller.getBiddingList)

  app.post('/auction/bid', [authJwt.verifyToken], controller.createProductBid)

  app.get('/auction/bidCount/:productId', controller.getAuctionProductBidCount)

  app.post('/auction/buy', [authJwt.verifyToken], controller.createProductBuy)

  app.get('/auction/seller/:seller', controller.getProductOfSeller)

  app.post('/auction/finish', controller.finishAuctionProduct)

  app.post('/auction/checkout', [authJwt.verifyToken], controller.checkoutProduct)


}
