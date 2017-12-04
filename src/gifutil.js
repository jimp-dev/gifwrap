'use strict';

const fs = require('fs');
const { GifFrame, GifError } = require('./gif');
const { GifCodec } = require('./gifcodec');

const INVALID_SUFFIXES = ['.jpg', '.jpeg', '.png', '.bmp'];

const defaultCodec = new GifCodec();

exports.cloneFrames = function (frames) {
    let clones = [];
    frames.forEach(frame => {

        clones.push(new GifFrame(frame));
    });
    return clones;
}

/**
 * Gets information about the colors used in the provided frames. The method is able to return an array of all colors found across all frames. `maxGlobalIndex` controls whether the computation short-circuits to avoid doing work that the caller doesn't need. The method only returns `colors` and `indexCount` for the colors across all frames when the number of indexes required to store the colors and transparency in a GIF (which is the value of `indexCount`) is less than or equal to `maxGlobalIndex`. Short-circuting is useful when the caller just needs to determine whether any frame includes transparency.
 * @param {GifFrame[]} frames Frames to examine for color and transparency.
 * @param {number} maxGlobalIndex Maximum number of color indexes (including one for transparency) allowed among the returned compilation of colors. `colors` and `indexCount` are not returned if the number of color indexes required to accommodate  all frames exceeds this number. Returns `colors` and `indexCount` by default.
 * @returns Object containing at least `palettes` and `usesTransparency`. `palettes` is an array of all the palettes returned by GifFrame#getPalette(). `usesTransparency` indicates whether at least one frame uses transparency. If `maxGlobalIndex` is not exceeded, the object also contains `colors`, an array of all colors (RGB) found across all palettes, sorted by increasing value, and `indexCount` indicating the number of indexes required to store the colors and the transparency in a GIF.
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
            throw new GifError(
                    `Frame ${i} uses more than 256 color indexes`);
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
