'use strict';

const RBTree = require('bintrees').RBTree;
const Omggif = require('./omggif');
const { Gif, GifError } = require('./gif');
let GifUtil; // allow circular dependency with GifUtil
process.nextTick(() => {
    GifUtil = require('./gifutil').GifUtil
});

const { GifFrame } = require('./gifframe');

const PER_GIF_OVERHEAD = 200; // these are guesses at upper limits
const PER_FRAME_OVERHEAD = 100;

// Note: I experimented with accepting a global color table when encoding and returning the global color table when decoding. Doing this properly greatly increased the complexity of the code and the amount of clock cycles required. The main issue is that each frame can specify any color of the global color table to be transparent within the frame, while this GIF library strives to hide GIF formatting details from its clients. E.g. it's possible to have 256 colors in the global color table and different transparencies in each frame, requiring clients to either provide per-frame transparency indexes, or for arcane reasons that won't be apparent to client developers, encode some GIFs with local color tables that previously decoded with global tables.

class GifCodec
{
    // _transparentRGBA - RGB given to transparent pixels (alpha=0) on decode; defaults to null indicating 0x000000, which is fastest

    constructor(options = {}) {
        this._transparentRGB = null; // 0x000000
        if (typeof options.transparentRGB === 'number' &&
                options.transparentRGB !== 0)
        {
            this._transparentRGBA = options.transparentRGB * 256;
        }
    }

    decodeGif(buffer) {
        try {
            let reader;
            try {
                reader = new Omggif.GifReader(buffer);
            }
            catch (err) {
                throw new GifError(err);
            }
            const frameCount = reader.numFrames();
            const frames = [];
            const spec = {
                width: reader.width,
                height: reader.height,
                loops: reader.loopCount()
            };

            spec.usesTransparency = false;
            for (let i = 0; i < frameCount; ++i) {
                const frameInfo =
                        this._decodeFrame(reader, i, spec.usesTransparency);
                frames.push(frameInfo.frame);
                if (frameInfo.usesTransparency) {
                    spec.usesTransparency = true;
                }
            }
            return Promise.resolve(new Gif(buffer, frames, spec));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }

    encodeGif(frames, spec = {}) {
        try {
            if (frames === null || frames.length === 0) {
                throw new GifError("there are no frames");
            }
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

            spec = Object.assign({}, spec); // don't munge caller's spec
            spec.width = maxWidth;
            spec.height = maxHeight;
            spec.loops = spec.loops || 0;
            spec.colorScope = spec.colorScope || Gif.GlobalColorsPreferred;

            return Promise.resolve(_encodeGif(frames, spec));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }

    _decodeFrame(reader, frameIndex, alreadyUsedTransparency) {
        let info, buffer;
        try {
            info = reader.frameInfo(frameIndex);
            buffer = new Buffer(info.width * info.height * 4);
            reader.decodeAndBlitFrameRGBA(frameIndex, buffer);
        }
        catch (err) {
            throw new GifError(err);
        }

        let usesTransparency = false;
        if (this._transparentRGBA === null) {
            if (!alreadyUsedTransparency) {
                for (let i = 3; i < buffer.length; i += 4) {
                    if (buffer[i] === 0) {
                        usesTransparency = true;
                        i = buffer.length;
                    }
                }
            }
        }
        else {
            for (let i = 3; i < buffer.length; i += 4) {
                if (buffer[i] === 0) {
                    buffer.writeUInt32BE(this._transparentRGBA, i - 3);
                    usesTransparency = true; // GIF might encode unused index
                }
            }
        }

        const frame = new GifFrame(info.width, info.height, buffer, {
            xOffset: info.x,
            yOffset: info.y,
            disposalMethod: info.disposal,
            interlaced: info.interlaced,
            delayCentisecs: info.delay
        });
        return { frame, usesTransparency };
    }
}
exports.GifCodec = GifCodec;

function _colorLookupLinear(colors, color) {
    for (let i = 0; i < colors.length; ++i) {
        if (colors[i] === color) {
            return i;
        }
    }
    return null;
}

function _colorLookupBinary(colors, color) {
    // adapted from https://stackoverflow.com/a/10264318/650894
    var lo = 0, hi = colors.length - 1, mid;
    while (lo <= hi) {
        mid = Math.floor((lo + hi)/2);
        if (colors[mid] > color)
            hi = mid - 1;
        else if (colors[mid] < color)
            lo = mid + 1;
        else
            return mid;
    }
    return null;
}

function _encodeGif(frames, spec) {
    let colorInfo;
    if (spec.colorScope === Gif.LocalColorsOnly) {
        colorInfo = GifUtil.getColorInfo(frames, 0);
    }
    else {
        colorInfo = GifUtil.getColorInfo(frames, 256);
        if (!colorInfo.colors) { // if global palette impossible
            if (spec.colorScope === Gif.GlobalColorsOnly) {
                throw new GifError(
                        "Too many color indexes for global color table");
            }
            spec.colorScope = Gif.LocalColorsOnly
        }
    }
    spec.usesTransparency = colorInfo.usesTransparency;

    const localPalettes = colorInfo.palettes;
    if (spec.colorScope === Gif.LocalColorsOnly) {
        const localSizeEst = _getSizeEstimateLocal(localPalettes, frames);
        return _encodeLocal(frames, spec, localSizeEst, localPalettes);
    }

    const globalSizeEst = _getSizeEstimateGlobal(colorInfo, frames);
    return _encodeGlobal(frames, spec, globalSizeEst, colorInfo);
}

function _encodeGlobal(frames, spec, bufferSizeEst, globalPalette) {
    const buffer = new Buffer(bufferSizeEst);
    // would be inefficient for frames to lookup colors in extended palette 
    const extendedGlobalPalette = {
        colors: globalPalette.colors.slice(),
        usesTransparency: globalPalette.usesTransparency
    };
    _extendPaletteToPowerOf2(extendedGlobalPalette);
    const options = {
        palette: extendedGlobalPalette.colors,
        loop: spec.loops
    };
    let gifWriter;
    try {
        gifWriter = new Omggif.GifWriter(buffer, spec.width, spec.height,
                            options);
    }
    catch (err) {
        throw new GifError(err);
    }
    for (let i = 0; i < frames.length; ++i) {
        _writeFrame(gifWriter, i, frames[i], globalPalette, false);
    }
    return new Gif(buffer.slice(0, gifWriter.end()), frames, spec);
}

function _encodeLocal(frames, spec, bufferSizeEst, localPalettes) {
    const buffer = new Buffer(bufferSizeEst);
    const options = {
        loop: spec.loops
    };
    let gifWriter;
    try {
        gifWriter = new Omggif.GifWriter(buffer, spec.width, spec.height,
                            options);
    }                            
    catch (err) {
        throw new GifError(err);
    }
    for (let i = 0; i < frames.length; ++i) {
        _writeFrame(gifWriter, i, frames[i], localPalettes[i], true);
    }
    return new Gif(buffer.slice(0, gifWriter.end()), frames, spec);
}

function _extendPaletteToPowerOf2(palette) {
    const colors = palette.colors;
    if (palette.usesTransparency) {
        colors.push(0);
    }
    const colorCount = colors.length;
    let powerOf2 = 2;
    while (colorCount > powerOf2) {
        powerOf2 <<= 1;
    }
    colors.length = powerOf2;
    colors.fill(0, colorCount);
}

function _getFrameSizeEst(frame, pixelBitWidth) {
    let byteLength = frame.bitmap.width * frame.bitmap.height;
    byteLength = Math.ceil(byteLength * pixelBitWidth / 8);
    byteLength += Math.ceil(byteLength / 255); // add block size bytes
    // assume maximum palete size because it might get extended for power of 2
    return (PER_FRAME_OVERHEAD + byteLength + 3 * 256 /* largest palette */);
}

function _getIndexedImage(frameIndex, frame, palette) {
    const colors = palette.colors;
    const colorToIndexFunc = (colors.length <= 5 ? // guess at the break-even
            _colorLookupLinear : _colorLookupBinary);
    const colorBuffer = frame.bitmap.data;
    const indexBuffer = new Buffer(colorBuffer.length/4);
    let transparentIndex = colors.length;
    let i = 0, j = 0;

    while (i < colorBuffer.length) {
        if (colorBuffer[i + 3] === 255) {
            const color = (colorBuffer.readUInt32BE(i, true) >> 8) & 0xFFFFFF;
            // caller guarantees that the color will be in the palette
            indexBuffer[j] = colorToIndexFunc(colors, color);
        }
        else {
            indexBuffer[j] = transparentIndex;
        }
        i += 4; // skip alpha
        ++j;
    }

    if (palette.usesTransparency) {
        if (transparentIndex === 256) {
            throw new GifError(`Frame ${frameIndex} already has 256 colors` +
                    `and so can't use transparency`);
        }
    }
    else {
        transparentIndex = null;
    }

    return { buffer: indexBuffer, transparentIndex };
}

function _getPixelBitWidth(palette) {
    let indexCount = palette.indexCount;
    let pixelBitWidth = 0;
    --indexCount; // start at maximum index
    while (indexCount) {
        ++pixelBitWidth;
        indexCount >>= 1;
    }
    return (pixelBitWidth > 0 ? pixelBitWidth : 1);
}

function _getSizeEstimateGlobal(globalPalette, frames) {
    let sizeEst = PER_GIF_OVERHEAD + 3*256 /* max palette size*/;
    const pixelBitWidth = _getPixelBitWidth(globalPalette);
    frames.forEach(frame => {
        sizeEst += _getFrameSizeEst(frame, pixelBitWidth);
    });
    return sizeEst; // should be the upper limit
}

function _getSizeEstimateLocal(palettes, frames) {
    let sizeEst = PER_GIF_OVERHEAD;
    for (let i = 0; i < frames.length; ++i ) {
        const palette = palettes[i];
        const pixelBitWidth = _getPixelBitWidth(palette);
        sizeEst += _getFrameSizeEst(frames[i], pixelBitWidth);
    }
    return sizeEst; // should be the upper limit
}

function _writeFrame(gifWriter, frameIndex, frame, palette, isLocalPalette) {
    if (frame.interlaced) {
        throw new GifError("writing interlaced GIFs is not supported");
    }
    const frameInfo = _getIndexedImage(frameIndex, frame, palette);
    const options = {
        delay: frame.delayCentisecs,
        disposal: frame.disposalMethod,
        transparent: frameInfo.transparentIndex
    };
    if (isLocalPalette) {
        _extendPaletteToPowerOf2(palette); // ok cause palette never used again
        options.palette = palette.colors;
    }
    try {
        gifWriter.addFrame(frame.xOffset, frame.yOffset, frame.bitmap.width,
                frame.bitmap.height, frameInfo.buffer, options);
    }
    catch (err) {
        throw new GifError(err);
    }
}
