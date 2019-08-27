var express = require('express');
var router = express.Router();

const sessionDb = require ('../app/init').sessionDb

/* GET home page. */
router.get('/', function(req, res, next) {
   const users = sessionDb.listUsers ().map (user => {
    return {username: user.username, models: user.listModels()}
  })
  res.render('users', {
    title: 'Students',
    users,
    principal: req.principal
  });
});

module.exports = router;
