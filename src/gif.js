'use strict';

const ExtendableError = require('es6-error');
const { Util } = require('./util');
const { GifCodec } = require('./gifcodec');

const defaultDecoder = new GifCodec(); // happens to be stateless
const defaultEncoder = defaultDecoder;
const INVALID_SUFFIXES = ['.jpg', '.jpeg', '.png', '.bmp'];

class Gif {

    // width - width of GIF in pixels
    // height - height of GIF in pixels
    // loops - 0 = unending; (n > 0) = iterate n times
    // usesTransparency - whether any frames have transparent pixels
    // optimization - one of Gif.OptimizeFor*
    // frames - array of frames
    // buffer - GIF-formatted data
    // encoder - encoder used to encode the buffer
    // decoder - decoder used to decode the buffer

    constructor(buffer, frames, spec) {
        this.width = spec.width;
        this.height = spec.height;
        this.loops = spec.loops;
        this.usesTransparency = spec.usesTransparency;
        this.optimization = spec.optimization;
        this.frames = frames;
        this.buffer = buffer;
    }

    static read(source, decoder) {
        decoder = decoder || defaultDecoder;
        if (Buffer.isBuffer(source)) {
            return decoder.decodeGif(source);
        }
        else {
            return Util.readBinary(source)
            .then(buffer => {

                return decoder.decodeGif(buffer);
            });
        }
    }

    static setDefaultDecoder(decoder) {
        defaultDecoder = decoder;
    }

    static setDefaultEncoder(encoder) {
        defaultEncoder = encoder;
    }

    static write(path, frames, spec, encoder) {
        const matches = path.match(/\.[a-zA-Z]+$/); // prevent accidents
        if (matches !== null &&
                INVALID_SUFFIXES.includes(matches[0].toLowerCase()))
        {
            throw new Error(`GIF '${path}' has an unexpected suffix`);
        }

        encoder = encoder || defaultEncoder;
        return encoder.encodeGif(frames, spec)
        .then(gif => {

            return Util.writeBinary(path, gif.buffer)
            .then(() => {

                return gif;
            });
        })
    }
}

Gif.OptimizeForSpeed = 1;
Gif.OptimizeForSize = 2;
Gif.OptimizeForBoth = 3;

class GifError extends ExtendableError {

    constructor(message) {
        super(message);
    }
}

exports.Gif = Gif;
exports.GifError = GifError;
