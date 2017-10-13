'use strict';

const ExtendableError = require('es6-error');

class Gif {

    // width - width of GIF in pixels
    // height - height of GIF in pixels
    // loops - 0 = unending; (n > 0) = iterate n times
    // usesTransparency - whether any frames have transparent pixels
    // optimization - one of Gif.OptimizeFor* after encoding
    // frames - array of frames
    // buffer - GIF-formatted data

    constructor(buffer, frames, spec) {
        this.width = spec.width;
        this.height = spec.height;
        this.loops = spec.loops;
        this.usesTransparency = spec.usesTransparency;
        this.optimization = spec.optimization;
        this.frames = frames;
        this.buffer = buffer;
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
