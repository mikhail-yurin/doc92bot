var fs = require('fs');
var path = require('path');


var cfg = function () { };

cfg.getProps = function () {
    return new Promise(function (resolve, reject) {
        fs.readFile(path.resolve(__dirname, '..', 'doc92bot_auth', 'auth.json'), function (err, authData) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(authData, 'utf8'));
            }
        });
    });
};

module.exports = cfg;