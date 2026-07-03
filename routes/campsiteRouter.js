const express = require("express");
const Campsite = require("../models/campsite");
const campsiteRouter = express.Router();

campsiteRouter.route("/")
// real API's rarely use .all()
.get((req, res, next) => {
    Campsite.find() // actually queries MongoDB
    .then(campsites => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsites); 
        // res.json() serializes value into JSON, set the JSON headers, and send it
    })
    .catch(err => next(err));
})
.post((req, res, next) => {
    console.log(req.body);
    // database operation → success handler → error handler → express middleware
    Campsite.create(req.body) // inserts into MongoDB
    // need error handling bc Mongoose operations return Promises
    .then(campsite => {
        console.log('Campsite Created ', campsite);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err)); 
    // next(err) sends error to global error handler in app.js
})
.put((req, res) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /campsites');
})
.delete((req, res, next) => {
    Campsite.deleteMany() // deletes all docs
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err))
});

campsiteRouter.route('/:campsiteId')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.post((req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}`);
})
.put((req, res, next) => {
    Campsite.findByIdAndUpdate(req.params.campsiteId, {
        $set: req.body
    }, { new: true })
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.delete((req, res, next) => {
    Campsite.findByIdAndDelete(req.params.campsiteId)
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

module.exports = campsiteRouter;