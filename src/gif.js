'use strict';

const ExtendableError = require('es6-error');

class Gif {

    // width - width of GIF in pixels
    // height - height of GIF in pixels
    // loops - 0 = unending; (n > 0) = iterate n times
    // usesTransparency - whether any frames have transparent pixels
    // storage - method of storing color palette (global or local)
    // frames - array of frames
    // buffer - GIF-formatted data

    constructor(buffer, frames, spec) {
        this.width = spec.width;
        this.height = spec.height;
        this.loops = spec.loops;
        this.usesTransparency = spec.usesTransparency;
        this.storage = spec.storage;
        this.frames = frames;
        this.buffer = buffer;
    }
}

Gif.StoreGlobalIfCan = 0;
Gif.StoreGlobal = 1;
Gif.StoreLocal = 2;

class GifError extends ExtendableError {

    constructor(messageOrError) {
        super(messageOrError);
        if (messageOrError instanceof Error) {
            this.stack = 'Gif' + messageOrError.stack;
        }
    }
}

exports.Gif = Gif;
exports.GifError = GifError;
