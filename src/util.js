
const fs = require('fs');

exports.readBinary = function (source) {
    // TBD: add support for URLs
    return new Promise((resolve, reject) => {

        fs.readFile(filename, (err, buffer) => {

            if (err) {
                return reject(err);
            }
            return resolve(buffer);
        });
    });
}

exports.writeBinary = function (path, buffer) {
    // TBD: add support for URLs
    return new Promise((resolve, reject) => {

        fs.writeFile(path, buffer, err => {
            
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
}
