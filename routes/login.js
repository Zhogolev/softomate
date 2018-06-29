const express = require('express');
const router = express.Router();
const getCountry = require('../scripts/utility/getiplocation');


/* GET users listing. */
router.get('/', function (req, res, next) {
    const ip = req.query.ip;
    res.status(200);
    if (ip) {
        getCountry(ip, function (err, result) {
            res
                .status(200)
                .set('Content-Type', 'application/Json')
                .send({
                    ip: ip,
                    country: err ? err.message : result
                });
        })
    }
    res.end();
});

module.exports = router;
