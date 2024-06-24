const db = require('../models')
const Role = db.role
require('dotenv').config()

db.mongoose
  .connect(process.env.MONGOURL, {
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
