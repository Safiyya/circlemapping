var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require("fs");
var path = require('path');

require('dotenv').config()

// let jwtSecret = process.env.JWT_SECRET;
let isDevelopment = process.env.NODE_ENV !== "production"
if (isDevelopment) {
    let PRIVATE_KEY = fs.readFileSync(path.join(__dirname, "../id_rsa"));
    let PUBLIC_KEY = fs.readFileSync(path.join(__dirname, "../rsa.pub"));
}
else {
    let PRIVATE_KEY = Buffer.from(process.env.SSH_PRIVATE_KEY)
    let PUBLIC_KEY = Buffer.from(process.env.SSH_PUBLIC_KEY)
}


router.post('/encode', function (req, res, next) {
    try {
        let token = jwt.sign(req.body, PRIVATE_KEY, {
            algorithm: 'RS256'
        });
        res.json({ token: token });
    }
    catch (err) {
        res.send(err);
    }
});

router.get('/decode/:token', function (req, res, next) {
    try {
        let object = jwt.verify(req.params.token, PUBLIC_KEY);
        res.json(object)
    }
    catch (err) {
        res.send(err);
    }


});

module.exports = router;