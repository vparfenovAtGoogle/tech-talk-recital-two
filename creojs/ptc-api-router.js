const express = require('express');

module.exports = function (applicationObj) {
  const router = express.Router()
  const handler = function(req, res, next) {
    //function sendException (ex) {  }
    function sendException (ex) {
      if (ex instanceof Error) {
        const stack = ex.stack.split ('\n')
        const msg = stack.shift()
        res.json({exception: {msg, stack}})
      }
      else {
        res.json({exception: `${ex}`})
      }
    }
    function sendResult (result) {
      if (result instanceof Promise) {
        result
          .then (result => sendResult(result))
          .catch (ex => sendException (ex))
      }
      else {
        res.json({result})
      }
    }
    const query = req.query 
    console.log(`query: ${JSON.stringify (query)}, path: ${req.path}, path: ${req.method}, url: ${req.url}`)
    if (Object.keys (query).length > 0) {
      try {
        let func = applicationObj [query.func]
        if (typeof func === 'function') {
            func = func.bind (applicationObj)
        }
        else {
            throw `${query.func} does not exist`
        }
        const args = query.args
        sendResult (args ? func (...JSON.parse (args)) : func ())
      }
      catch (ex) {
        sendException (ex)
      }
    }
  }
  router.use('/', function(req, res, next) { 
    res.setHeader('Last-Modified', (new Date()).toUTCString());
    next(); 
  })
  router.get('/', handler)
  router.post('/', handler)
  return router
}
