const db = require('../models')
const dbConfig = require('../config/db.config')
const Role = db.role

db.mongoose
  .connect('mongodb://127.0.0.1:27017/Auction', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Successfully connect to MongoDB.')
    initial()
  })
  .catch((err) => {
    console.error('Connection error', err)
    process.exit()
  })

function initial() {
  Role.estimatedDocumentCount()
    .then((count) => {
      if (count === 0) {
        const userRole = new Role({
          name: 'user'
        })

        const adminRole = new Role({
          name: 'admin'
        })

        return Promise.all([userRole.save(), adminRole.save()])
      }
    })
    .then((savedRoles) => {
      if (savedRoles) {
        savedRoles.forEach((savedRole) => {
          console.log(`added '${savedRole.name}' to roles collection`)
        })
      }
    })
    .catch((err) => {
      console.error('Error when counting documents or saving roles', err)
    })
}

module.exports = {
  db
}
