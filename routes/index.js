var express = require('express');
var router = express.Router();

const googleAuthSecret = process.env ['WEBSITE_AUTH_GOOGLE_CLIENT_SECRET']

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.principal) {
    res.redirect ('/users')
  }
  else if (req.isCreoAgent) {
    res.redirect ('/creo_app.html')
  }
  else if (googleAuthSecret) {
    res.redirect ('/.auth/login/google?post_login_redirect_url=/users')
  }
  else {
    res.render('index', { title: 'PTC Tech Talk!' });
  }
});

module.exports = router;
