var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var modelsRouter = require('./routes/models');
var fileRouter = require('./app/filestore');
require ('./creojs/ptc-creo-js').bootstrap (`${__dirname}/public`)

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.principal = req.query.principal || req.headers ['x-ms-client-principal-name']
  next ()
})

app.use((req, res, next) => {
  const userAgent = req.headers ['user-agent']
  req.isCreoAgent = (userAgent && userAgent.indexOf ('Creo') > -1)
  next ()
})

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/models', modelsRouter);
app.use('/files', fileRouter);

const appData = require ('./app/init')
app.use('/api', appData.apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
