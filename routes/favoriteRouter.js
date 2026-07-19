const express = require("express");
const Favorite = require("../models/favorite");
const favoriteRouter = express.Router();
const authenticate = require("../authenticate");
const cors = require("./cors");

// ROUTE 1

favoriteRouter.route("/")
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorite.find({ user: req.user._id })
    .populate("user")
    .populate("campsites")
    .then(favorite => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json(favorite);
    })
    .catch(err => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorite.findOne({ user: req.user._id })
    .then(favorite => {
        if (!favorite) {
            return Favorite.create({
                user: req.user._id,
                campsites: req.body
            });
        }
        req.body.forEach(id => {
            if (!favorite.campsites.some(c => c.toString() === id.toString())) {
                favorite.campsites.push(id);
            }
        });

        return favorite.save();
    })
    .then(favorite => {
        res.status(200).json(favorite);
    })
    .catch(err => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.status(403).send("PUT operation not supported");
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorite.findOneAndDelete({ user: req.user._id })
    .then(favorite => {
        res.statusCode = 200;
        if (favorite) {
            res.setHeader("Content-Type", "application/json");
            res.json(favorite);
        } else {
            res.setHeader("Content-Type", "text/plain");
            res.end("You do not have any favorites to delete.");
        }
    })
    .catch(err => next(err));
});

// ROUTE 2

favoriteRouter.route("/:campsiteId")
.options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
.get(cors.cors, authenticate.verifyUser, (req, res) => {
    res.status(403).send("GET operation not supported");
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorite.findOne({ user: req.user._id })
        .then(favorite => {
            if (!favorite) {
                return Favorite.create({
                    user: req.user._id,
                    campsites: [req.params.campsiteId]
                });
            }

            const campsiteId = req.params.campsiteId;

            if (favorite.campsites.some(id => id.toString() === campsiteId)) {
                res.status(200).type("text/plain");
                res.end("That campsite is already a favorite!");
                return null; // this fixed [ERR_HTTP_HEADERS_SENT]
            }

            favorite.campsites.push(campsiteId);
            return favorite.save();
        })
        .then(favorite => {
            if (favorite) {
                res.status(200).json(favorite);
            }
        })
        .catch(err => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
    res.status(403).send("PUT operation not supported");
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorite.findOne({ user: req.user._id })
        .then(favorite => {
            if (!favorite) {
                res.status(200).type("text/plain");
                return res.end("You do not have any favorites to delete.");
            }

            const campsiteId = req.params.campsiteId;

            favorite.campsites = favorite.campsites.filter(
                id => id.toString() !== campsiteId
            );

            return favorite.save();
        })
        .then(favorite => {
            if (favorite) {
                res.status(200).json(favorite);
            }
        })
        .catch(err => next(err));
});

module.exports = favoriteRouter;