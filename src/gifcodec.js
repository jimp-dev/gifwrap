'use strict';

const Omggif = require('omggif');
const RBTree = require('bintrees').RBTree;
const { Gif, GifFrame, GifError } = require('./index');

const PER_GIF_OVERHEAD = 34; // est. bytes per GIF excluding palette & data
const PER_FRAME_OVERHEAD = 22; // est. bytes per frame excluding palette & data

// TBD: use buffer.writeUInt32BE() and buffer.readUInt32BE()

class GifCodec {

    // _transparentRGB - RGB given to transparent pixels (alpha=0) on decode, broken into RGB array (or nulls); or null to leave pixel RGB undefined

    constructor(options = {}) {
        this._transparentRGB = null; // assume transparent color not defined
        if (typeof options.transparentColor === 'number') {
            this._transparentRGB = [
                (options.transparentColor >> 16) & 0xff,
                (options.transparentColor >> 8) & 0xff,
                options.transparentColor & 0xff
            ];
        }
        else if (options.transparentColor === null) {
            this._transparentRGB = [ null, null, null ];
        }
    }

    decodeGif(buffer) {
        return new Promise((resolve, reject) => {

            try {
                const reader = new Omggif.GifReader(buffer);
                const frameCount = reader.numFrames();
                const frames = [];
                const spec = {
                    width: reader.width,
                    height: reader.height,
                    decoder: this
                };

                spec.loops = reader.loopCount();
                if (Number.isInteger(spec.loops)) {
                    if (spec.loops > 0) {
                        ++spec.loops;
                    }
                }
                else {
                    spec.loops = 1;
                }

                spec.usesTransparency = false;
                for (let i = 0; i < frameCount; ++i) {
                    const frameInfo = _decodeFrame(i);
                    frames.push(frameInfo.frame);
                    if (frameInfo.usesTransparency) {
                        spec.usesTransparency = true;
                    }
                }

                resolve(new Gif(buffer, frames, spec));
            }
            catch (err) {
                if (typeof err === 'string') {
                    err = new GifError(err);
                }
                reject(err);
            }
        });
    }

    encodeGif(frames, spec = {}) {
        if (frames === null || frames.length === 0) {
            throw new GifError("there are no frames");
        }
        let maxWidth = 0, maxHeight = 0;
        frames.forEach(frame => {
            if (frame.bitmap.width > maxWidth) {
                maxWidth = frame.bitmap.width;
            }
            if (frame.bitmap.height > maxHeight) {
                maxHeight = frame.bitmap.height;
            }
        });

        // impl currently limited to specifying frame dimensions
        if (spec.width && spec.width !== maxWidth ||
                spec.height && spec.height !== maxHeight)
        {
            throw new GifError(`GIF dimensions `+
                    `${spec.width} x ${spec.height} != max frame `+
                    `dimensions ${maxWidth} x ${maxHeight} `+
                    `(try not specifying GIF dimensions)`);
        }
                
        // impl currently requires all frames to have same dimensions
        for (let i = 0; i < frames.length; ++i) {
            const frame = frames[i];
            if (frame.bitmap.width !== maxWidth ||
                    frame.bitmap.height !== maxHeight)
            {
                throw new GifError(`Frame ${i} dimensions `+
                        `${frame.bitmap.width} x ${frame.bitmap.height}`+
                        ` != GIF dimensions ${maxWidth} x ${maxHeight}`);
            }
        }

        spec = Object.assign({}, spec); // clone to avoid munging caller's spec
        spec.width = maxWidth;
        spec.height = maxHeight;
        spec.loops = spec.loops || 0;
        spec.optimization = spec.optimization || Gif.OptimizeBoth;
        spec.usesTransparency = usesTransparency;

        return new Promise((resolve, reject) => {

            try {
                resolve(_encodeGif(frames, spec));
            }
            catch (err) {
                if (typeof err === 'string') {
                    err = new GifError(err);
                }
                reject(err);
            }
        });
    }

    _decodeFrame(frameIndex) {
        const info = reader.frameInfo(frameIndex);
        if (info.x !== 0 || info.y !== 0) {
            // TBD: I don't know what x,y means yet
            throw new GifError("GIF encoder does not support offset frames");
        }
        const buffer = new Buffer(info.width * info.height * 4);
        reader.decodeAndBlitFrameRGBA(frameIndex, buffer);

        let usesTransparency = false;
        if (this._transparentRGB !== null) {
            // this would be more efficient in the decoder than in the adapter
            for (let i = 0; i < buffer.length; i += 4) {
                if (buffer[i] === undefined) {
                    buffer[i] = this._transparentRGB[0];
                    buffer[i + 1] = this._transparentRGB[1];
                    buffer[i + 2] = this._transparentRGB[2];
                    buffer[i + 3] = 0; // alpha
                    usesTransparency = true; // GIF might encode unused index
                }
            }
        }

        const frame = new GifFrame(buffer, info.width, info.height, {
            isInterlaced: info.interlaced,
            delayHundreths: info.delay
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
    let loopCount = spec.loops;
    if (loopCount > 0) {
        if (loopCount === 1) {
            loopCount = null;
        }
        else {
            --loopCount;
        }
    }

    let usesTransparency = false;
    const localPalettes = [];
    for (let i = 0; i < frames.length; ++i) {
        let palette = frame[i].makePalette();
        palette.indexSize = palette.colors.length;
        if (palette.usesTransparency) {
            ++palette.indexSize;
            usesTransparency = true;
        }
        if (palette.indexSize > 256) {
            throw new GifError(`Frame {$i} uses more than 256 color indexes`);
        }
        localPalettes.push(palette);
    }
    if (spec.usesTransparency !== undefined && spec.usesTransparency != null &&
            usesTransparency !== spec.usesTransparency)
    {
        const specSays = (spec.usesTransparency ? 'uses' : 'does not use');
        const gifSays = (usesTransparency ? 'uses' : 'does not use');
        throw new GifError(`Gif spec asserts that GIF ${specSays} `+
                `transparency, but the GIF actually ${gifSays} it `+
                `(try not specifying 'usesTransparency')`);
    }
    const localSizeEst = _getSizeEstimateLocal(localPalettes, frames);

    // use local frame palettes if optimizing for speed

    if (spec.optimization === Gif.OptimizeSpeed) {
        return _encodeLocal(frames, spec, localSizeEst, localPalettes,
                    loopCount);
    }

    // otherwise decide whether to use a global palette

    const globalPaletteTree = new RBTree((a, b) => (a - b));
    localPalettes.forEach(palette => {

        palette.colors.forEach(color => {

            if (!globalPaletteTree.find(color)) {
                globalPaletteTree.insert(color);
            }
        });
    });
    let indexSize = globalPaletteTree.size;
    if (usesTransparency) {
        ++indexSize;
    }
    if (indexSize > 256 ) { // if global palette impossible
        return _encodeLocal(frames, spec, localSizeEst, localPalettes,
                    loopCount);
    }
    const colors = Array(globalPaletteTree.size);
    const iter = globalPaletteTree.iterator();
    for (let i = 0; i < colors.length; ++i) {
        colors[i] = iter.next();
    }
    const globalPalette = { colors, indexSize, usesTransparency };
    const globalSizeEst = _getSizeEstimateGlobal(globalPalette, frames);

    // when optimizing for both size and speed, base choice of local and
    // global palettes on the estimated sizes of the two buffers

    if (spec.optimization === Gif.OptimizeBoth) {
        if (globalSizeEst <= localSizeEst) {
            return _encodeGlobal(frames, spec, globalSizeEst, globalPalette,
                        loopCount);
        }
        return _encodeLocal(frames, spec, localSizeEst, localPalettes,
                    loopCount);
    }

    // when optimizing for size, generate both GIFs and choose the smaller

    const globalBuffer = _encodeGlobal(frames, spec, globalSizeEst,
                                globalPalette, loopCount);
    const localBuffer =
            _encodeLocal(frames, spec, localSizeEst, localPalettes, loopCount);
    return (globalBuffer.length <= localBuffer.length
                ? globalBuffer : localBuffer);
}

function _encodeGlobal(frames, spec, bufferSizeEst, globalPalette, loopCount) {
    const buffer = new Buffer(bufferSizeEst);
    const options = {
        palette: globalPalette.colors,
        loop: loopCount
    };
    const gifWriter =
            new Omggif.GifWriter(buffer, spec.width, spec.height, options);
    for (let i = 0; i < frames.length; ++i) {
        _writeFrame(gifWriter, i, frames[i], globalPalette, false);
    }
    return new Gif(buffer.slice(0, gifWriter.end()), frames, spec);
}

function _encodeLocal(frames, spec, bufferSizeEst, localPalettes, loopCount) {
    const buffer = new Buffer(bufferSizeEst);
    const options = {
        loop: loopCount
    };
    const gifWriter =
            new Omggif.GifWriter(buffer, spec.width, spec.height, options);
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

function _getFrameSizeEst(frame, palette, pixelBitWidth) {
    let byteLength = frame.bitmap.width * frame.bitmap.height;
    byteLength = Math.ceil(byteLength * pixelBitWidth / 8);
    byteLength += Math.ceil(byteLength / 255); // add block ends
    return (PER_FRAME_OVERHEAD + byteLength + 3*palette.indexSize);
}

function _getIndexedImage(frameIndex, frame, palette) {
    const colors = palette.colors;
    const colorToIndexFunc = (colors.length <= 5 ? // guess at the break-even
            _colorLookupLinear : _colorLookupBinary);
    const colorBuffer = frame.bitmap.data;
    const indexBuffer = new Buffer(colorBuffer.length/4);
    const transparentIndex = colors.length;
    let i = 0, j = 0;

    while (i < colorBuffer.length) {
        if (colorBuffer[i + 3] === 255) {
            const color = (colorBuffer[i] << 16) + (colorBuffer[i + 1] << 8) +
                    colorBuffer[i + 2];
            // caller guarantees that the color will be in the palette
            indexBuffer[j] = colorToIndexFunc(colors, color);
        }
        else {
            indexBuffer[i] = transparentIndex;
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
    let indexSize = palette.indexSize;
    let pixelBitWidth = 0;
    --indexSize; // start at maximum index
    while (indexSize) {
        ++pixelBitWidth;
        indexSize >>= 1;
    }
    return (pixelBitWidth > 0 ? pixelBitWidth : 1);
}

function _getSizeEstimateGlobal(globalPalette, frames) {
    let sizeEst = PER_GIF_OVERHEAD + globalPalette.indexSize * 3;
    const pixelBitWidth = _getPixelBitWidth(globalPalette);
    frames.forEach(frame => {
        sizeEst += _getFrameSizeEst(frame, 0, pixelBitWidth);
    });
    return sizeEst; // should be the upper limit
}

function _getSizeEstimateLocal(palettes, frames) {
    let sizeEst = PER_GIF_OVERHEAD;
    for (let i = 0; i < frames.length; ++i ) {
        const palette = palettes[i];
        const pixelBitWidth = _getPixelBitWidth(palette);
        sizeEst += _getFrameSizeEst(frames[i], palette, pixelBitWidth);
    }
    return sizeEst; // should be the upper limit
}

function _writeFrame(gifWriter, frameIndex, frame, palette, isLocalPalette) {
    const frameInfo = _getIndexedImage(frameIndex, frame, palette);
    const options = {
        delay: frame.getDelay(),
        disposal: 0, // only disposal supported for now
        transparent: frameInfo.transparentIndex
    };
    _extendPaletteToPowerOf2(palette);
    if (isLocalPalette) {
        options.palette = palette.colors;
    }
    gifWriter.addFrame(0, 0, frame.bitmap.width, frame.bitmap.height,
            frameInfo.buffer, options);
}
