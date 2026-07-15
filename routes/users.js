const express = require('express');
const User = require('../models/user');
const passport = require("passport");
const authenticate = require("../authenticate");
const cors = require("./cors");

const router = express.Router();

router.options(cors.corsWithOptions, (req, res) => res.sendStatus(200));

/* GET users listing. */
router.get('/', cors.corsWithOptions, authenticate.verifyUser ,authenticate.verifyAdmin, (req, res, next) => {
    User.find()
    .then(users => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(users); 
    })
    .catch(err => next(err));
});

router.post('/signup', cors.corsWithOptions, (req, res) => {
    const user = new User({ username: req.body.username });
    User.register(user, req.body.password)
    .then(registeredUser => {
        if (req.body.firstname) {
            registeredUser.firstname = req.body.firstname;
        }
        if (req.body.lastname) {
            registeredUser.lastname = req.body.lastname;
        }
        return registeredUser.save();
    })
    .then(() => {
        passport.authenticate('local')(req, res, () => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({ success: true, status: "Registration Successful!" });
        })
    })
    .catch(err => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({ err: err });
    });
});

router.post("/login", cors.corsWithOptions, passport.authenticate("local", { session: false }), (req, res) => {
    const token = authenticate.getToken({ _id: req.user._id });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json({success: true, token: token, status: 'You are successfully logged in!'});
});

router.get('/logout', cors.corsWithOptions, (req, res, next) => {  
    if (req.session && req.session.user) {  // Check for a specific user property
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            res.clearCookie('session-id');
            res.redirect('/');
        });
    } else {  
        const err = new Error('You are not logged in!');
        err.status = 401;
        return next(err);
    }  
});

module.exports = router;
