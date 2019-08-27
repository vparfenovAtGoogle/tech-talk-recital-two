const sessionDb = require ('./session') ()
const apiRouter = require ('../creojs/ptc-api-router') (sessionDb)
module.exports = {sessionDb, apiRouter}