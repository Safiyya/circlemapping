var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
require('dotenv').config()
var db = mongojs(process.env.MONGODB_URI, ['datasets']);

/* GET All datasets */
router.get('/datasets', function (req, res, next) {
    db.datasets.find(function (err, datasets) {
        if (err) {
            res.send(err);
        } else {
            res.json(datasets);
        }
    });
});


/* GET One dataset with the provided ID */
router.get('/dataset/:id', function (req, res, next) {
    db.datasets.findOne(
        { _id: mongojs.ObjectId(req.params.id) },
        function (err, datasets) {
            if (err) {
                res.send(err);
            } else {
                res.json(datasets);
            }
        });
});

/* POST/SAVE a dataset */
router.post('/dataset', function (req, res, next) {
    var dataset = req.body;
    db.datasets.save(dataset, function (err, result) {
        if (err) {
            res.send(err);
        } else {
            res.json(result);
        }
    })
});


/* PUT/UPDATE a dataset */
router.put('/dataset/:did', function (req, res, next) {
    var dataset = req.body;
    db.datasets.update(
        { _id: mongojs.ObjectId(req.params.did) },
        req.body,
        { upsert: true },
        function (err, result) {
            if (err) {
                res.send(err);
            } else {
                res.json(result);
            }
        });
});

/* DELETE a dataset */
router.delete('/dataset/:id', function (req, res) {
    db.datasets.remove({
        _id: mongojs.ObjectId(req.params.id)
    }, '', function (err, result) {
        if (err) {
            res.send(err);
        } else {
            res.json(result);
        }
    });
});
module.exports = router;