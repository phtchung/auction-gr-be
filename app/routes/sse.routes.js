const express = require("express");
const sse = require("../sse/index")

module.exports = function (app) {
    // app.use(function (req, res, next) {
    //     res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    //     next()
    // })
    app.get('/events', (req, res, next) => {
        res.flush = () => {};
        next();
    }, sse.init);

}
