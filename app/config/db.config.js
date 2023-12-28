require('dotenv').config()
module.exports = {
  HOST: process.env.HOST,
  PORT: 27017,
  DB: process.env.DB,
  USERNAME: process.env.USERNAME,
  PASSWORD: process.env.PASSWORD
}
