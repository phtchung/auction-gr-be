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
  app.post('/admin/approvedData', [authJwt.verifyToken], controller.adminApproveAuctionController)

  app.post('/admin/rejectRequest', [authJwt.verifyToken], controller.adminRejectRequestController)

  //tạo rq từ qtv
  app.post('/admin/createProduct', [authJwt.verifyToken],upload.fields([{ name: 'singlefile[]', maxCount: 1 }, { name: 'files[]', maxCount: 16 }]), controller.adminCreateProductAution)

  app.post('/admin/cancelProduct', [authJwt.verifyToken], controller.adminCancelProduct)

  app.post('/admin/product/updateStatus', [authJwt.verifyToken, authJwt.isAdmin], controller.updateStatusByAdminController)

  app.post('/admin/request', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetRequestHistory)

  app.post('/admin/auctionHistoryList', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetAuctionHistoryList)

  app.get('/admin/request/history/:requestId', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetRequestHistoryDetail)

  app.post('/admin/adminAuctionCompletedList', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetAdminAuctionCompletedList)

  app.get('/admin/auctionCompletedDetail/:requestId', [authJwt.verifyToken],authJwt.isAdmin, controller.adminAuctionCompletedDetail)

  app.post('/admin/returnOfUser', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetProductReturnOfUser)

  app.post('/admin/returnOfAdmin', [authJwt.verifyToken],authJwt.isAdmin, controller.adminGetProductReturnOfAdmin)

  app.post('/admin/acceptReturn', [authJwt.verifyToken, authJwt.isAdmin], controller.acceptReturnProductController)

  app.post('/admin/denyReturn', [authJwt.verifyToken, authJwt.isAdmin], controller.denyReturnProductController)

  app.post('/admin/createBlog', [authJwt.verifyToken,authJwt.isAdmin],upload.fields([{ name: 'singlefile[]', maxCount: 1 }, { name: 'singlefile_sub[]', maxCount: 1 }]), controller.createBlogController)

  app.post('/admin/createCategories', [authJwt.verifyToken,authJwt.isAdmin],upload.fields([{ name: 'singlefile[]', maxCount: 1 }]), controller.createCategory)

  app.get('/admin/categories', [authJwt.verifyToken,authJwt.isAdmin], controller.getCategories)

  // category con thêm mới
  app.post('/category/:id', [authJwt.verifyToken,authJwt.isAdmin], controller.createChildCategory)

  app.get('/admin/categoryChild/:id', [authJwt.verifyToken,authJwt.isAdmin], controller.getCategoriesChild)

  app.get('/admin/categoryParent/:id', [authJwt.verifyToken,authJwt.isAdmin], controller.getcategoryParent)

  app.put('/admin/category', [authJwt.verifyToken,authJwt.isAdmin], controller.editCategory)

  app.delete('/admin/category/:id', [authJwt.verifyToken,authJwt.isAdmin], controller.deleteCategory)

  app.post('/admin/streamAuction', [authJwt.verifyToken],authJwt.isAdmin, controller.getUserStreamAuction)

  app.post('/admin/resendCode', [authJwt.verifyToken,authJwt.isAdmin], controller.ReSendCode)

  app.post('/admin/sendCodeToEmail', [authJwt.verifyToken,authJwt.isAdmin], controller.sendCodeToAnotherEmail)

  app.post('/admin/streamTracking', [authJwt.verifyToken],authJwt.isAdmin, controller.getStreamAuctionTracking)

  app.post('/admin/setUrlStream', [authJwt.verifyToken,authJwt.isAdmin], controller.setUrlStream)

  app.delete('/admin/streamAuction/:id', [authJwt.verifyToken,authJwt.isAdmin], controller.deleteStreamAuction)

}
