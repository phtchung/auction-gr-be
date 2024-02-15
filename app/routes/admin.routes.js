const { authJwt } = require('../middlewares')
const controller = require('../controllers/admin.controller')

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.get('/api/test/admin', [authJwt.verifyToken, authJwt.isAdmin], controller.adminBoard)

  app.get('/admin/product/reqCount', [authJwt.verifyToken], controller.adminGetRequestCount)

  app.post('/admin/product/reqList', [authJwt.verifyToken], controller.adminGetRequestList)

  app.get('/admin/request/:requestId', [authJwt.verifyToken], controller.adminGetRequestDetail)

  app.post('/admin/approvedData', [authJwt.verifyToken], controller.adminCreateAuction)

  app.post('/admin/rejectRequest', [authJwt.verifyToken], controller.adminRejectRequest)

}
