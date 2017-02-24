var fs = require('fs');
var os = require('os');
var path = require('path');
var request = require('request');
var cfg = require('./ConfigReader');


var Checker = function () {
    cfg.getProps()
        .then(function (props) {
            this.props = props;
        })
        .catch(function (err) {
            console.log(err);
        });
    var inbox = os.tmpdir() + path.sep + 'doc92' + path.sep + 'inbox';

    this.run = function () {
        return new Promise(function (resolve, reject) {
            fs.readdir(inbox, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    files.forEach(file => {
                        fs.readFile(inbox + path.sep + file, (err, data) => {
                            check(data.toString())
                                .then(function (weeklink) {
                                    resolve({
                                        file: file,
                                        link: weeklink
                                    });
                                })
                                .catch(function () {
                                    reject();
                                });
                        });
                    });
                }
            });
        });
    };

    function check(link) {
        return new Promise(function (resolve, reject) {
            getSession().then(function (cookies) {
                [...Array(8).keys()].forEach(function (index) {
                    var weeklink = link.replace(/week\=0/g, `week=${index}`);
                    getSchedule(cookies, weeklink).then(function (body) {
                        // fs.writeFile(`./week${index}.html`, body, function () {
                        // });
                        if (/class\=\"gettickets\"/g.exec(body) !== null) {
                            resolve(weeklink);
                        } else {
                            reject();
                        }
                    });
                });
            });
        });
    }

    function getSession() {
        return new Promise(function (resolve, reject) {
            request.post({
                url: 'https://doctor-92.ru/account/logon',
                jar: true,
                form: {
                    Login: this.props.login,
                    Password: this.props.pass
                }
            }, function (err, httpResponse) {
                var cookies = httpResponse.headers['set-cookie'].toString();
                if (!err) {
                    resolve(cookies);
                } else {
                    reject(err);
                }
            });
        });
    }

    function getSchedule(cookies, link) {
        return new Promise(function (resolve, reject) {
            var weeklink = link.replace(/cardfileid\=[\da-z\-]+/g, 'cardfileid=' + this.props.cardfileid);
            request.get({
                url: weeklink,
                jar: true,
                headers: {
                    'Cookie': cookies,
                }
            }, function (err, httpResponse, body) {
                if (!err) {
                    resolve(body);
                } else {
                    reject(err);
                }
            });
        });
    }
};

module.exports = Checker;