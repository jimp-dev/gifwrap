'use strict';

/** @namespace GifUtil */

const fs = require('fs');
const { GifFrame } = require('./gifframe');
const { GifError } = require('./gif');
const { GifCodec } = require('./gifcodec');

const INVALID_SUFFIXES = ['.jpg', '.jpeg', '.png', '.bmp'];

const defaultCodec = new GifCodec();

/**
 * cloneFrames() clones provided frames. It's a utility method for cloning an entire array of frames at once.
 * 
 * @function cloneFrames
 * @memberof GifUtil
 * @param {GifFrame[]} frames An array of GifFrame instances to clone
 * @return {GifFrame[]} An array of GifFrame clones of the provided frames.
 */

exports.cloneFrames = function (frames) {
    let clones = [];
    frames.forEach(frame => {

        clones.push(new GifFrame(frame));
    });
    return clones;
}

/**
 * getColorInfo() gets information about the colors used in the provided frames. The method is able to return an array of all colors found across all frames.
 * 
 * `maxGlobalIndex` controls whether the computation short-circuits to avoid doing work that the caller doesn't need. The method only returns `colors` and `indexCount` for the colors across all frames when the number of indexes required to store the colors and transparency in a GIF (which is the value of `indexCount`) is less than or equal to `maxGlobalIndex`. Such short-circuiting is useful when the caller just needs to determine whether any frame includes transparency.
 * 
 * @function getColorInfo
 * @memberof GifUtil
 * @param {GifFrame[]} frames Frames to examine for color and transparency.
 * @param {number} maxGlobalIndex Maximum number of color indexes (including one for transparency) allowed among the returned compilation of colors. `colors` and `indexCount` are not returned if the number of color indexes required to accommodate  all frames exceeds this number. Returns `colors` and `indexCount` by default.
 * @returns {object} Object containing at least `palettes` and `usesTransparency`. `palettes` is an array of all the palettes returned by GifFrame#getPalette(). `usesTransparency` indicates whether at least one frame uses transparency. If `maxGlobalIndex` is not exceeded, the object also contains `colors`, an array of all colors (RGB) found across all palettes, sorted by increasing value, and `indexCount` indicating the number of indexes required to store the colors and the transparency in a GIF.
 * @throws {GifError} When any frame requires more than 256 color indexes.
 */

exports.getColorInfo = function (frames, maxGlobalIndex) {
    let usesTransparency = false;
    const palettes = [];
    for (let i = 0; i < frames.length; ++i) {
        let palette = frames[i].getPalette();
        if (palette.usesTransparency) {
            usesTransparency = true;
        }
        if (palette.indexCount > 256) {
            throw new GifError(`Frame ${i} uses more than 256 color indexes`);
        }
        palettes.push(palette);
    }
    if (maxGlobalIndex === 0) {
        return { usesTransparency, palettes };
    }

    const globalColorSet = new Set();
    palettes.forEach(palette => {

        palette.colors.forEach(color => {

            globalColorSet.add(color);
        });
    });
    let indexCount = globalColorSet.size;
    if (usesTransparency) {
        // odd that GIF requires a color table entry at transparent index
        ++indexCount;
    }
    if (maxGlobalIndex && indexCount > maxGlobalIndex) {
        return { usesTransparency, palettes };
    }
    
    const colors = new Array(globalColorSet.size);
    const iter = globalColorSet.values();
    for (let i = 0; i < colors.length; ++i) {
        colors[i] = iter.next().value;
    }
    colors.sort((a, b) => (a - b));
    return { colors, indexCount, usesTransparency, palettes };
};

/**
 * getMaxDimensions() returns the pixel width and height required to accommodate all of the provided frames, according to the offsets and dimensions of each frame.
 * 
 * @function getMaxDimensions
 * @memberof GifUtil
 * @param {GifFrame[]} frames Frames to measure for their aggregate maximum dimensions.
 * @return {object} An object of the form {maxWidth, maxHeight} indicating the maximum width and height required to accommodate all frames.
 */

exports.getMaxDimensions = function (frames) {
    let maxWidth = 0, maxHeight = 0;
    frames.forEach(frame => {
        const width = frame.xOffset + frame.bitmap.width;
        if (width > maxWidth) {
            maxWidth = width;
        }
        const height = frame.yOffset + frame.bitmap.height;
        if (height > maxHeight) {
            maxHeight = height;
        }
    });
    return { maxWidth, maxHeight };
};

/**
 * read() decodes an encoded GIF, whether provided as a filename or as a byte buffer.
 * 
 * @function read
 * @memberof GifUtil
 * @param {string|Buffer} source Source to decode. When a string, it's the GIF filename to load and parse. When a Buffer, it's an encoded GIF to parse.
 * @param {object} An optional GIF decoder object implementing the `decode` method of class GifCodec. When provided, the method decodes the GIF using this decoder. When not provided, the method uses GifCodec.
 * @return {Promise} A Promise that resolves to an instance of the Gif class, representing the decoded GIF.
 */

exports.read = function (source, decoder) {
    decoder = decoder || defaultCodec;
    if (Buffer.isBuffer(source)) {
        return decoder.decodeGif(source);
    }
    return _readBinary(source)
    .then(buffer => {

        return decoder.decodeGif(buffer);
    });
};

/**
 * write() encodes a GIF and saves it as a file.
 * 
 * @function write
 * @memberof GifUtil
 * @param {string} path Filename to write GIF out as. Will overwrite an existing file.
 * @param {GifFrame[]} frames Array of frames to be written into GIF.
 * @param {object} spec An optional object that may provide values for `loops` and `colorScope`, as defined for the Gif class. However, `colorSpace` may also take the value Gif.GlobalColorsPreferred (== 0) to indicate that the encoder should attempt to create only a global color table. `loop` defaults to 0, looping indefinitely, and `colorScope` defaults to Gif.GlobalColorsPreferred.
 * @param {object} encoder An optional GIF encoder object implementing the `encode` method of class GifCodec. When provided, the method encodes the GIF using this encoder. When not provided, the method uses GifCodec.
 * @return {Promise} A Promise that resolves to an instance of the Gif class, representing the encoded GIF.
 */

exports.write = function (path, frames, spec, encoder) {
    encoder = encoder || defaultCodec;
    const matches = path.match(/\.[a-zA-Z]+$/); // prevent accidents
    if (matches !== null &&
            INVALID_SUFFIXES.includes(matches[0].toLowerCase()))
    {
        throw new Error(`GIF '${path}' has an unexpected suffix`);
    }

    return encoder.encodeGif(frames, spec)
    .then(gif => {

        return _writeBinary(path, gif.buffer)
        .then(() => {

            return gif;
        });
    });
};

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
