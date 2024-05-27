const { authJwt } = require('../middlewares')
const controller = require('../controllers/auction.controller')

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.get('/bidding', [authJwt.verifyToken], controller.getBiddingList)

  app.get('/auction/topBidList/:product_id', [authJwt.verifyToken], controller.getTopBidOfProduct)

  app.post('/auction/topBidStream', [authJwt.verifyToken], controller.getTopBidStream)

  app.get('/auction/fullBidList/:product_id', [authJwt.verifyToken], controller.getFullBidOfProduct)

  app.post('/auction/bid', [authJwt.verifyToken], controller.CreateBidController)

  app.get('/auction/bidCount/:productId', controller.getAuctionProductBidCount)

  app.post('/auction/buy', [authJwt.verifyToken], controller.BuyProductController)

  app.get('/auction/seller/:seller', controller.getProductOfSeller)

  app.get('/home/seller/:id', controller.getProductsByFilterSellerHome)

  app.post('/auction/finish', controller.finishAuctionProductController)

  app.post('/auction/online/finish', controller.finishAuctionOnlineController)

  app.post('/auction/checkout', [authJwt.verifyToken], controller.checkoutProductController)

  app.get('/auction/topSeller', controller.getTopSeller)

  app.get('/auction/product1k', controller.getProduct1k)

  app.get('/auction/productRare', controller.getRareProduct)

  app.get('/auction/standOut', controller.getStandoutProduct)

  app.get('/auction/prepareToEnd', controller.getProductPrepareEnd)

  app.get('/categories', controller.getCategories)

  app.get('/category/:id', controller.getCategoryDetail)

  app.get('/home/category/:id', controller.getProductsByFilter)

  app.get('/search', controller.getSearchProducts)

  app.get('/auction/relatedItem/:id', controller.getRalatedProduct)

  app.post('/auction/online/bid', [authJwt.verifyToken], controller. createRealtimeBid)

  app.post('/auction/stream/bid', [authJwt.verifyToken], controller. createStreamBid)

  app.get('/checkoutDeposit/:id',[authJwt.verifyToken],controller.getCheckOutDeposit)

  app.get('/getConfirmDeposit/:id',[authJwt.verifyToken],controller.getConfirmDeposit)

  app.post('/auction/checkoutDeposit', [authJwt.verifyToken], controller.checkoutDeposit)

  app.post('/auction/productRealtime',[authJwt.verifyToken], controller.getRealtimeProduct)

  app.post('/auction/productStream',[authJwt.verifyToken], controller.getStreamProduct)

  app.post('/auction/checkPasswordStreamRoom',[authJwt.verifyToken], controller.checkPWStreamRoom)
// nay là api cho phòng đấu giá , kia là cho đăng kí
  app.post('/auction/streamGeneral',[authJwt.verifyToken], controller.getStreamAuctionGeneral)

}
