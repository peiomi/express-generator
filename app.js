const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require("mongoose");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const passport = require("passport");
const authenticate = require("./authenticate");

const url = 'mongodb://127.0.0.1:27017/nucampsite';
const connect = mongoose.connect(url, {});

connect.then(() => console.log("Connected correctly to server"),
  err => console.log(err)
);

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

const campsiteRouter = require('./routes/campsiteRouter');
const promotionRouter = require('./routes/promotionRouter');
const partnerRouter = require('./routes/partnerRouter');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use(cookieParser("12345-67890-09876-54321"));

app.use(session({
  name: "session-id",
  secret: "12345-67890-09876-54321",
  saveUninitialized: false,
  resave: false,
  store: new FileStore()
}));
// need to be after session
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// authentication need to come b4 routers
function auth(req, res, next) {
  console.log(req.session);

  if (!req.user) {
    const err = new Error("You are not authenticated!");
    err.status = 401;
    return next(err);

  } else {
    return next();
  }
}
app.use(auth);

// routers need to be mounted after express parses json && b4 404
app.use('/campsites', campsiteRouter);
app.use('/promotions', promotionRouter);
app.use('/partners', partnerRouter);

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
