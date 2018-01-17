'use strict';

const BitmapImage = require('./bitmapimage');
const { GifError } = require('./gif');

/** @class GifFrame */

class GifFrame extends BitmapImage {

    // xOffset - x offset of bitmap on GIF (defaults to 0)
    // yOffset - y offset of bitmap on GIF (defaults to 0)
    // disposalMethod - pixel disposal method when handling partial images
    // delayCentisecs - duration of frame in hundredths of a second
    // interlaced - whether the image is interlaced (defaults to false)

    /**
     * GifFrame is a class representing an image frame of a GIF. GIFs contain one or more instances of GifFrame.
     * 
     * Property | Description
     * --- | ---
     * xOffset | x-coord of position within GIF at which to render the image (defaults to 0)
     * yOffset | y-coord of position within GIF at which to render the image (defaults to 0)
     * disposalMethod | GIF disposal method; only relevant when the frames aren't all the same size (defaults to 2, disposing to background color)
     * delayCentisecs | duration of the frame in hundreths of a second
     * interlaced | boolean indicating whether the frame renders interlaced
     * 
     * Its constructor supports the following signatures:
     * 
     * * new GifFrame(bitmap: {width: number, height: number, data: Buffer}, options?)
     * * new GifFrame(bitmapImage: BitmapImage, options?)
     * * new GifFrame(width: number, height: number, buffer: Buffer, options?)
     * * new GifFrame(width: number, height: number, backgroundRGBA?: number, options?)
     * * new GifFrame(frame: GifFrame)
     * 
     * See the base class BitmapImage for a discussion of all parameters but `options` and `frame`. `options` is an optional argument providing initial values for the above-listed GifFrame properties. Each property within option is itself optional.
     * 
     * Provide a `frame` to the constructor to create a clone of the provided frame. The new frame includes a copy of the provided frame's pixel data so that each can subsequently be modified without affecting each other.
     */

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
}

GifFrame.DisposeToAnything = 0;
GifFrame.DisposeNothing = 1;
GifFrame.DisposeToBackgroundColor = 2;
GifFrame.DisposeToPrevious = 3;

exports.GifFrame = GifFrame;
