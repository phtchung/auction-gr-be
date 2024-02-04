const { authJwt } = require('../middlewares')
const controller = require('../controllers/request.controller')
const multer = require("multer");

const upload = multer();
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.post('/request', [authJwt.verifyToken], controller.getRequest)

  app.get('/request/:requestId', [authJwt.verifyToken], controller.getRequestDetail)

  app.get('/request/history/:requestId', [authJwt.verifyToken], controller.getRequestHistoryDetail)

  app.post('/requests', [authJwt.verifyToken],upload.array('files[]'), controller.createRequest)

  app.post('/upload', controller.upload)
}
