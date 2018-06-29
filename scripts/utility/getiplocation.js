const fs = require('fs');
const path = require('path');
const net = require('net');
const IpConverter = require('./Ip4toInt');

const SIZE = 10;//размер одной записи  в файле

const cache = {
    buffer: null,
    bufferSize: null,
    data: null,
    lastline: 0
};

const privateIps = [
    [IpConverter('10.0.0.0'), IpConverter('10.255.255.255')],
    [IpConverter('172.16.0.0'), IpConverter('172.31.255.255')],
    [IpConverter('192.168.0.0'), IpConverter('192.168.255.255')],
    [IpConverter('100.64.0.0'), IpConverter('100.127.255.255')]
];


function loaddata(pathdb) {


    pathdb = pathdb || path.join(__dirname, '../../db/data/country.dat');

    const db = fs.openSync(pathdb, 'r');

    cache.bufferSize = fs.fstatSync(db).size;
    cache.lastline = cache.bufferSize / SIZE - 1;

    cache.buffer = new Buffer(cache.bufferSize);
    const buf = cache.buffer;

    fs.readSync(db, cache.buffer, 0, cache.bufferSize, 0);
    fs.closeSync(db);

}

loaddata();

function isPrivateIp(ip, cb) {

    for (let index = 0; index < privateIps.length; index++) {
        if( privateIps[index][0] <= ip && ip <= privateIps[index][1] )
            return cb(true);

        if(index === privateIps.length - 1  )
            return cb(false);
    }
}

module.exports = function (ip, cb) {

    if (!net.isIPv4(ip)) return cb(new Error("Sorry, this is not IPv4"));

    const currentIp = IpConverter(ip);

    isPrivateIp(currentIp, function(isPrivate) {
        if(isPrivate)
            return cb(new Error('Sorry, this is your private ip'));
        //т.к. в дата файле ип отсортерованы по возрастающему
        //можно применить алгоритм деления отрезка пополам
        const buf = cache.buffer;

        let fline = 0;

        let lLine = cache.lastline;
        let mLine = Math.floor(lLine / 2);

        let fLineIp1;
        let fLineIp2;
        let llineIp1;
        let llineIp2;
        let mLineIp1;
        let mLineIp2;

        while (mLine !== fline && mLine !== lLine) {
            fLineIp1 = buf.readUInt32BE(fline * SIZE);
            fLineIp2 = buf.readUInt32BE(fline * SIZE + 4);

            llineIp1 = buf.readUInt32BE(lLine * SIZE);
            llineIp2 = buf.readUInt32BE(lLine * SIZE + 4);

            mLineIp1 = buf.readUInt32BE(mLine * SIZE);
            mLineIp2 = buf.readUInt32BE(mLine * SIZE + 4);
            //смотрим значения на концах
            if (fLineIp1 <= currentIp && currentIp <= fLineIp2)
                return cb(null, buf.toString('utf-8', fline * SIZE + 8, (1 + fline) * SIZE));

            if (llineIp1 <= currentIp && currentIp <= llineIp2)
                return cb(null, buf.toString('utf-8', lLine * SIZE + 8, (1 + lLine) * SIZE));

            if(mLineIp1 <= currentIp && currentIp <= mLineIp2)
                return cb(null, buf.toString('utf-8', mLine * SIZE + 8, (1 + mLine) * SIZE));

            if (buf.readUInt32BE(mLine * SIZE) <= currentIp) {
                fline = mLine;

            } else {
                lLine = mLine;
            }

            mLine = Math.floor((fline + lLine) / 2);

        }

         cb(new Error('No info found'));
    })
};