'use strict'
//npm зависимости
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');
const unzip = require('unzip-stream');
const through = require('through2');
const split = require('split');

//директории базы данных
const dbdir = path.join(__dirname, '..', 'db');
const dataPath = path.join(dbdir, 'data');

const db = {
    url: 'https://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip',
    dest: 'country.dat',
    src: 'GeoIPCountryWhois.csv'
};

function mkdir(name) {

    const dir = name;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

console.log(dataPath);


//создадим папки под данные полученные с сайта
mkdir(dbdir);
mkdir(dataPath);


//https://dev.maxmind.com/geoip/legacy/geolite/ заберем отсюда базу данных
// в csv формате
function getDb(database, cb) {

    //ссылка для гет запроса
    const dburl = database.url;
    //имя файла, куда будут сохраненны данные
    //в итоге filename === GeoIPCountryCSV.zip
    const filename = db.dest;
    const tmpFile = path.join(dataPath, filename);

    const options = url.parse(database.url);
    //url.parse возвращает .protocol по умолчанию "https:"
    options.protocol = "http:";

    const tmpFileStream = fs.createWriteStream(tmpFile);
    const convert = through(function (buf, enc, next) {

        const data = buf.toString().replace(/"/g, '').split(',');

        if (data.length === 6) {
            const buffer = new Buffer(10);//8 байт под ip адреса + 2 под страну
            try {
                //console.log(parseInt(data[2], 10) + ' - ' + parseInt(data[3], 10));
                buffer.fill(0);
                buffer.writeUInt32BE(parseInt(data[2], 10), 0); // Начальный интовый ip адрес
                buffer.writeUInt32BE(parseInt(data[3], 10), 4); // Конечный интовый ip адрес
                buffer.write(data[4], 8);                       // Страна (две буквы)
                this.push(buffer);

            } catch (err) {
                console.log(data[5]);
            }

        }

        next();
    });


    const onResponse = function (response) {
        //обрабатываем ошибку сервера бд.
        //нам важен только положительный ответ
        //который имеет номер "200"
        if (response.statusCode !== 200) {
            process.stdout('server error : ', response.statusCode);
            client.abort();
            return cb(new Error('error'));
        }

        response
        //Полученный файл имеет формат .zip поэтому его надо распаковать
            .pipe(unzip.Parse())
            //Архив содержит файд с бд , его нужно сохранить
            .on('entry', function (entry) {
                //Мало ли что может прийти в ахриве, отберем только бд с ip
                if (entry.type === 'File' && entry.path === db.src)
                    entry.pipe(split())
                        .pipe(convert)
                        .pipe(tmpFileStream)
                        .on('close', function () {
                            console.log('File: ', entry.path, ' was successful extracted into ', db.dest);
                        })
                        .on('error', function (err) {
                            cb(err);
                        })
            })
            //Во время скачивания  - архив может повредится...
            //Надо отработать это
            .on('error', function (err) {
                return cb(err);
            })

    };

    const client = http.get(options, onResponse);

    console.log('Start getting data');


}

getDb(db, function (err) {
    if (!err) {
        console.log('successful');
    } else console.log('error');
});
