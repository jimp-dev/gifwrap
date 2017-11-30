'use strict';

const BitmapImage = require('./bitmapimage');
const { GifError } = require('./gif');

class GifFrame extends BitmapImage {

    // xOffset - x offset of bitmap on GIF (defaults to 0)
    // yOffset - y offset of bitmap on GIF (defaults to 0)
    // disposalMethod - pixel disposal method when handling partial images
    // delayCentisecs - duration of frame in hundredths of a second
    // interlaced - whether the image is interlaced (defaults to false)

    constructor(...args) {
        super(...args);
        if (args[0] instanceof GifFrame) {
            // copy a provided GifFrame
            const source = args[0];
            this.xOffset = source.xOffset;
            this.yOffset = source.yOffset;
            this.disposalMethod = source.disposalMethod;
            this.delayCentisecs = source.delayCentisecs;
            this.interlaced = source.interlaced;
        }
        else {
            const lastArg = args[args.length - 1];
            let options = {};
            if (typeof lastArg === 'object' && !(lastArg instanceof BitmapImage)) {
                options = lastArg;
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

}

GifFrame.DisposeToAnything = 0;
GifFrame.DisposeNothing = 1;
GifFrame.DisposeToBackgroundColor = 2;
GifFrame.DisposeToPrevious = 3;

exports.GifFrame = GifFrame;
