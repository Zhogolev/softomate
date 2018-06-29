const net = require('net');
const mod = require('./getiplocation');
const async =require('async');
//console.log(net.isIPv4('123.123.9.21'));

const ips = [
    '123.123.9.21'

];

async.every(ips, function(ip, callback) {
   mod(ip,function (err,res) {
       if(err)
           console.error(err.message);

       else console.log(res);
       callback()
   })
}, function(err, result) {

    // if result is true then every file exists
});

mod(ips[0], (err, res) => {
    console.log(err? err.message : res);
});