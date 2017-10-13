
const fs = require('fs');
const { GifCodec } = require('./gifcodec');

const INVALID_SUFFIXES = ['.jpg', '.jpeg', '.png', '.bmp'];

const defaultCodec = new GifCodec();

class GifUtil {

    // _decoder - for decoding GIFs, implementing GifDecoder 
    // _encoder - for encoding GIFs, implementing GifEncoder 

    constructor(options) {
        options = options || {};
        this._decoder = options.decoder || defaultCodec;
        this._encoder = options.encoder || defaultCodec;
    }

    create(options) {
        return new GifUtil(options);
    }

    read(source) {
        if (Buffer.isBuffer(source)) {
            return this._decoder.decodeGif(source);
        }
        return _readBinary(source)
        .then(buffer => {

            return this._decoder.decodeGif(buffer);
        })
    }

    write(path, frames, spec) {
        const matches = path.match(/\.[a-zA-Z]+$/); // prevent accidents
        if (matches !== null &&
                INVALID_SUFFIXES.includes(matches[0].toLowerCase()))
        {
            throw new Error(`GIF '${path}' has an unexpected suffix`);
        }

        return this._encoder.encodeGif(frames, spec)
        .then(gif => {

            return _writeBinary(path, gif.buffer)
            .then(() => {

                return gif;
            });
        })
    }
}
exports.GifUtil = new GifUtil();

function _readBinary(path) {
    // TBD: add support for URLs
    return new Promise((resolve, reject) => {

        fs.readFile(path, (err, buffer) => {

            if (err) {
                return reject(err);
            }
            return resolve(buffer);
        });
    });
}

function _writeBinary(path, buffer) {
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
