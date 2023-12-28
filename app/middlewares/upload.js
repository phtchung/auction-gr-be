const util = require('util')
const Multer = require('multer')

let processFile = Multer({
  storage: Multer.memoryStorage()
}).array('images')

let processFileMiddleware = util.promisify(processFile)
module.exports = processFileMiddleware
