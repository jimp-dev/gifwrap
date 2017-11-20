'use strict';

const Jimp = require('jimp');
const { GifError } = require('./gif');

class GifFrame extends Jimp {

    // xOffset - x offset of bitmap on GIF (defaults to 0)
    // yOffset - y offset of bitmap on GIF (defaults to 0)
    // disposalMethod - pixel disposal method when handling partial images
    // delayCentisecs - duration of frame in hundredths of a second
    // interlaced - whether the image is interlaced (defaults to false)

    constructor(...args) {
        if (args[0] instanceof GifFrame) {
            const sourceFrame = args[0];
            super(sourceFrame);
            this.xOffset = sourceFrame.xOffset;
            this.yOffset = sourceFrame.yOffset;
            this.disposalMethod = sourceFrame.disposalMethod;
            this.delayCentisecs = sourceFrame.delayCentisecs;
            this.interlaced = sourceFrame.interlaced;
        }
        else {
            // Jimp is throwing undefined, itself an error, for invalid constructor parameters, so we'll enforce valid parameters here.
            let options = {};
            if (typeof args[0] === 'string' && typeof args[1] === 'function' &&
                    args.length === 2)
            {
                super(...args);
            }
            else if (args[0] instanceof Jimp && args.length === 1) {
                super(args[0]);
            }
            else if (typeof args[0] === 'number' &&
                        typeof args[1] === 'number')
            {
                if (Buffer.isBuffer(args[2])) {
                    let argCount = 3;
                    if (typeof args[3] === 'object') {
                        options = args[3];
                        argCount = 4;
                    }
                    if (args.length > argCount) {
                        _throwBadConstructor();
                    }
                    super(2, 2); // create a temporary dummy bitmap
                    this.bitmap = {
                        width: args[0],
                        height: args[1],
                        data: args[2]
                    };
                }
                else {
                    const argCount = (typeof args[2] === 'number' ? 3 : 2);
                    if (typeof args[argCount] === 'object') {
                        options = args[argCount];
                        args.splice(argCount, 1);
                    }
                    if (args.length > argCount) {
                        _throwBadConstructor();
                    }
                    super(...args);
                }
            }
            else if (args[0] !== null && typeof args[0] === 'object' &&
                    args[0].width && args[0].height && args[0].data)
            {
                let argCount = 1;
                if (typeof args[1] === 'object') {
                    options = args[1];
                    argCount = 2;
                }
                if (args.length > argCount) {
                    _throwBadConstructor();
                }
                super(2, 2); // create a temporary dummy bitmap
                this.bitmap = args[0];
            }
            else {
                _throwBadConstructor();
            }
            this.xOffset = options.xOffset || 0;
            this.yOffset = options.yOffset || 0;
            this.disposalMethod = (options.disposalMethod !== undefined ?
                    options.disposalMethod : GifFrame.DisposeToBackgroundColor);
            this.delayCentisecs = options.delayCentisecs || 8;
            this.interlaced = options.interlaced || false;
        }
    }

    getPalette() {
        // returns with colors sorted low to high
        const colorSet = new Set();
        const buf = this.bitmap.data;
        let i = 0;
        let usesTransparency = false;
        while (i < buf.length) {
            if (buf[i + 3] < 255) {
                usesTransparency = true;
            }
            else {
                // can eliminate the bitshift by starting one byte prior
                const color = (buf.readUInt32BE(i, true) >> 8) & 0xFFFFFF;
                colorSet.add(color);
            }
            i += 4; // skip alpha
        }
        const colors = new Array(colorSet.size);
        const iter = colorSet.values();
        for (i = 0; i < colors.length; ++i) {
            colors[i] = iter.next().value;
        }
        colors.sort((a, b) => (a - b));
        let indexCount = colors.length;
        if (usesTransparency) {
            ++indexCount;
        }
        return { colors, usesTransparency, indexCount };
    }

    greyscale(cb) {
        // modified from Jimp, which was converting 0xffffff to 0xfefefe and
        // also using a less accurate weighting
        const buf = this.bitmap.data;
        this.scan(0, 0, this.bitmap.width, this.bitmap.height, (x, y, idx) => {
            const grey = Math.round(
                0.299 * buf[idx] +
                0.587 * buf[idx + 1] +
                0.114 * buf[idx + 2]
            );
            buf[idx] = grey;
            buf[idx + 1] = grey;
            buf[idx + 2] = grey;
        });

        if (typeof cb === 'function') return cb.call(this, null, this);
        else return this;
    }

    reframe(xOffset, yOffset, width, height, fillRGBA) {
        const cropX = (xOffset < 0 ? 0 : xOffset);
        const cropY = (yOffset < 0 ? 0 : yOffset);
        const cropWidth = (width + cropX > this.bitmap.width ?
                this.bitmap.width - cropX : width);
        const cropHeight = (height + cropY > this.bitmap.height ?
                this.bitmap.height - cropY : height);
        const newX = (xOffset < 0 ? -xOffset : 0);
        const newY = (yOffset < 0 ? -yOffset : 0);

        let image;
        if (fillRGBA === undefined) {
            if (cropX !== xOffset || cropY != yOffset ||
                    cropWidth !== width || cropHeight !== height)
            {
                throw new GifError(`fillRGBA required for this reframing`);
            }
            image = new Jimp(width, height);
        }
        else {
            image = new Jimp(width, height, fillRGBA);
        }
        image.blit(this, newX, newY, cropX, cropY, cropWidth, cropHeight);
        this.bitmap = image.bitmap;
        return this;
    }

    scale(factor, mode) {
        if (mode) {
            return super.scale(factor, mode);
        }
        if (factor === 1) {
            return;
        }
        if (!Number.isInteger(factor) || factor < 1) {
            throw new Error(
                    "the scale must be an integer >= 1 when there is no mode");
        }
        const sourceWidth = this.bitmap.width;
        const sourceHeight = this.bitmap.height;
        const destByteWidth = sourceWidth * factor * 4;
        const sourceBuf = this.bitmap.data;
        const destBuf = new Buffer(sourceHeight * destByteWidth * factor);
        let sourceIndex = 0;
        let priorDestRowIndex;
        let destIndex = 0;
        for (let y = 0; y < sourceHeight; ++y) {
            priorDestRowIndex = destIndex;
            for (let x = 0; x < sourceWidth; ++x) {
                const color = sourceBuf.readUInt32BE(sourceIndex, true);
                for (let cx = 0; cx < factor; ++cx) {
                    destBuf.writeUInt32BE(color, destIndex);
                    destIndex += 4;
                }
                sourceIndex += 4;
            }
            for (let cy = 1; cy < factor; ++cy) {
                destBuf.copy(destBuf, destIndex, priorDestRowIndex, destIndex);
                destIndex += destByteWidth;
                priorDestRowIndex += destByteWidth;
            }
        }
        this.bitmap = {
            width: sourceWidth * factor,
            height: sourceHeight * factor,
            data: destBuf
        };
        return this;
    }

    scanAll(scanHandler) {
        const width = this.bitmap.width;
        const bufferLength = this.bitmap.data.length;
        let bi = 0;
        let x = 0;
        let y = 0;

        while (bi < bufferLength) {
            scanHandler(x, y, bi);
            bi += 4;
            if (++x === width) {
                x = 0;
                ++y;
            }
        }
    }
}

GifFrame.DisposeToAnything = 0;
GifFrame.DisposeNothing = 1;
GifFrame.DisposeToBackgroundColor = 2;
GifFrame.DisposeToPrevious = 3;

exports.GifFrame = GifFrame;

function _throwBadConstructor() {
    throw new Error("unrecognized constructor parameterization");
}

/*
The current release of Jimp (0.2.28) does not make this available.

Jimp.appendConstructorOption('gifwrap-frame', (...args) => {

    return (args.length === 0);
}, jimpFrameConstructor);

function jimpFrameConstructor(resolve, reject) {
    // GifFrame sets up bitmap on return from super()
    resolve();
}
*/
