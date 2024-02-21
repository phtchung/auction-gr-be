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


}
