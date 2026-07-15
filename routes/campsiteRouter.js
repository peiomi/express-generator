const express = require("express");
const Campsite = require("../models/campsite");
const campsiteRouter = express.Router();
const authenticate = require("../authenticate");
const cors = require("./cors");

// ROUTE 1

campsiteRouter.route("/")
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, (req, res, next) => {
    Campsite.find() // actually queries MongoDB
    .populate("comments.author")
    .then(campsites => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsites); 
        // res.json() serializes value into JSON, maybe sets the headers???
    })
    .catch(err => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    console.log(req.body);
    // database operation → success handler → error handler → express middleware
    Campsite.create(req.body) // inserts into MongoDB
    // need then/catch (or await/async) bc Mongoose operations return Promises
    .then(campsite => {
        console.log('Campsite Created ', campsite);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err)); 
    // next(err) sends error to global error handler in app.js
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end('PUT operation not supported on /campsites');
})
.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.deleteMany() // deletes all docs
    // deleteMany is an atomic operation (doesnt need querying, mutating, or save())
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err))
});

// ROUTE 2

campsiteRouter.route('/:campsiteId')
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate("comments.author")
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}`);
})
.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
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
.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findByIdAndDelete(req.params.campsiteId)
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

// ROUTE 3

campsiteRouter.route("/:campsiteId/comments")
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate("comments.author")
    .then(campsite => {
        if (campsite) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments);
        } else {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
// dont accidentally duplicate ids in postman
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    // 1. load document from DB
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            req.body.author = req.user._id;
            // 2. mutate document
            campsite.comments.push(req.body);
            // 3. persist changes back to DB
            campsite.save() // Mongoose document method, returns a promise that resolves to updated document
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`PUT operation not supported on /campsites/${req.params.campsiteId}/comments`);
})
// delete method logic for a collection INSIDE a single object (top level collections use deleteMany)
.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            // you have to loop backwards when removing items so indexes dont shift
            for (let i = (campsite.comments.length-1); i >= 0; i--) {
                campsite.comments.id(campsite.comments[i]._id).deleteOne(); // deleteOne() marks a subdoc for removal
            }
            campsite.save() // confirms deletion
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

// ROUTE 4

campsiteRouter.route("/:campsiteId/comments/:commentId")
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate("comments.author")
    .then(campsite => {
        // mongoose does NOT reject the promise if doc is not found (result is either found document or null)
        // so need to check if it exists still
        if (campsite && campsite.comments.id(req.params.commentId)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments.id(req.params.commentId));
        } else if (!campsite) {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        } else {
            const err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}/comments/${req.params.commentId}`);
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        // does campsite exist
       if (!campsite) {
        const err = new Error(`Campsite ${req.params.campsiteId} not found`);
        err.status = 404;
        return next(err);
       }

       // does comment exist 
       const comment = campsite.comments.id(req.params.commentId);
       if (!comment) {
            const err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
       }

       // is user the author 
       if (!comment.author.equals(req.user._id)) {
            const err = new Error("You are not authorized to modify this comment.");
            err.status = 403;
            return next(err);
       }

       // update the comment 
       if (req.body.rating) {
            comment.rating = req.body.rating;
        }
        if (req.body.text) {
            comment.text = req.body.text;
        }
        return campsite.save();
    })
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (!campsite) {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
        const comment = campsite.comments.id(req.params.commentId);
       if (!comment) {
            const err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
       }
       if (!comment.author.equals(req.user._id)) {
            const err = new Error("You are not authorized to delete this comment.");
            err.status = 403;
            return next(err);
       }
       campsite.comments.id(req.params.commentId).deleteOne();
       return campsite.save();
    })
    .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
    })
    .catch(err => next(err));
});

module.exports = campsiteRouter;

// post is only supported on collection routes bc you cant create an 
// object inside of an object, you have to create it inside the collection

// put is only supported on single object routes bc you cant replace an entire collection
// with a single object

// patch is for partial updates to a single object only
// you cant patch every object in a collection all at once
