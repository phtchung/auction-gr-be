const controller = require('../controllers/blog.controller')
const {authJwt} = require("../middlewares");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
        next()
    })

    app.get('/articles', controller.getBlogs)

    app.get('/articles/:id', controller.getBlogDetail)

}
