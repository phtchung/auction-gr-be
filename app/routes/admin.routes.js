const { authJwt } = require('../middlewares')
const controller = require('../controllers/admin.controller')
const multer = require("multer");

const upload = multer();
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })
  app.get('/admin/me', [authJwt.verifyToken], controller.getAdminProfile)

  app.get('/admin/product/reqCount', [authJwt.verifyToken], controller.adminGetRequestCount)

  app.post('/admin/product/reqList', [authJwt.verifyToken], controller.adminGetRequestList)

  app.get('/admin/product/biddingCount', [authJwt.verifyToken], controller.adminGetBiddingProductCount)

  app.post('/admin/product/bidList', [authJwt.verifyToken], controller.adminGetBiddingProductList)

  app.get('/admin/request/:requestId', [authJwt.verifyToken], controller.adminGetRequestDetail)

  // tạo đấu giá từ rq người dùng
  app.post('/admin/approvedData', [authJwt.verifyToken], controller.adminApproveAuction)

  app.post('/admin/rejectRequest', [authJwt.verifyToken], controller.adminRejectRequest)

  //tạo rq từ qtv
  app.post('/admin/createProduct', [authJwt.verifyToken],upload.fields([{ name: 'singlefile[]', maxCount: 1 }, { name: 'files[]', maxCount: 16 }]), controller.adminCreateProductAution)

  app.post('/admin/cancelProduct', [authJwt.verifyToken], controller.adminCancelProduct)

  app.post('/admin/product/updateStatus', [authJwt.verifyToken, authJwt.isAdmin], controller.updateStatusByAdmin)

  app.post('/admin/request', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetRequestHistory)

  app.post('/admin/auctionHistoryList', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetAuctionHistoryList)

  app.get('/admin/request/history/:requestId', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetRequestHistoryDetail)

  app.post('/admin/adminAuctionCompletedList', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetAdminAuctionCompletedList)

  app.get('/admin/auctionCompletedDetail/:requestId', [authJwt.verifyToken],authJwt.isAdmin, controller.adminAuctionCompletedDetail)

  app.post('/admin/returnOfUser', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetProductReturnOfUser)

  app.post('/admin/returnOfAdmin', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetProductReturnOfAdmin)

  app.post('/admin/acceptReturn', [authJwt.verifyToken, authJwt.isAdmin], controller.acceptReturnProduct)

  app.post('/admin/denyReturn', [authJwt.verifyToken, authJwt.isAdmin], controller.DenyReturnProduct)


}
