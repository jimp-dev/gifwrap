'use strict';

const Assert = require('assert');
const Jimp = require('jimp');
const Tools = require('./lib/tools');
const { Gif, GifFrame, GifCodec, GifUtil, GifError } = require('../src/index');

describe("single frame decoding", () => {

    it("reads an opaque monocolor file", () => {

        const name = 'singleFrameMonoOpaque';
        const bitmap = Tools.getBitmap(name);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: false
            });
        });
    });

    it("reads an opaque multi-color file", () => {

        const name = 'singleFrameMultiOpaque';
        const bitmap = Tools.getBitmap(name);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: false
            });
        });
    });

    it("reads a purely transparent file", () => {

        const name = 'singleFrameNoColorTrans';
        const bitmap = Tools.getBitmap(name, 0);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: true
            });
        });
    });

    it("reads a monochrome file with transparency", () => {

        const name = 'singleFrameMonoTrans';
        const bitmap = Tools.getBitmap(name, 0);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: true
            });
        });
    });

    it("reads a multicolor file with transparency", () => {

        const name = 'singleFrameMultiTrans';
        const bitmap = Tools.getBitmap(name, 0);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: true
            });
        });
    });

    it("reads a multicolor file with custom transparency color", () => {

        const transRGB = 0x123456;
        const name = 'singleFrameMultiTrans';
        const bitmap = Tools.getBitmap(name, transRGB);
        const gifUtil = GifUtil.create({
            decoder: new GifCodec({ transparentRGB: transRGB })
        });
        return gifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, [bitmap], {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: true
            });
        });
    });
});

describe("multiframe decoding", () => {

    it("reads a 2-frame multicolor file without transparency", () => {

        const name = 'twoFrameMultiOpaque';
        const series = Tools.getSeries(name);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, series, {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: false,
                delayHundreths: 50
            });
        });
    });

    it("reads a 3-frame monocolor file with transparency", () => {

        const name = 'threeFrameMonoTrans';
        const series = Tools.getSeries(name);
        return GifUtil.read(Tools.getGifPath(name))
        .then(gif => {

            _compareGifToSeries(gif, series, {
                disposalMethod: GifFrame.DisposeToBackgroundColor,
                usesTransparency: true,
                delayHundreths: 25
            });
        });
    });

    it("reads a large multiframe file w/out transparency", () => {

        return GifUtil.read(Tools.getGifPath('nburling-public'))
        .then(gif => {
        
            Assert.strictEqual(gif.width, 238);
            Assert.strictEqual(gif.height, 372);
            Assert.strictEqual(gif.loops, 0);
            Assert.strictEqual(gif.usesTransparency, false);
            Assert(Array.isArray(gif.frames));
            Assert.strictEqual(gif.frames.length, 24);
            for (let i = 0; i < gif.frames.length; ++i) {
                const frame = gif.frames[i];
                Assert.strictEqual(frame.bitmap.width, gif.width);
                Assert.strictEqual(frame.bitmap.height, gif.height);
                Tools.checkFrameDefaults(frame, {
                    xOffset: 0,
                    yOffset: 0,
                    disposalMethod: GifFrame.DisposeNothing,
                    delayHundreths: 20
                }, i);
            }
            Assert(Buffer.isBuffer(gif.buffer)); 
        });
    });

    it("reads a large multiframe file w/ offsets, w/out transparency", () => {

        return GifUtil.read(Tools.getGifPath('rnaples-offsets-public'))
        .then(gif => {

            Assert.strictEqual(gif.width, 480);
            Assert.strictEqual(gif.height, 693);
            Assert.strictEqual(gif.loops, 0);
            Assert.strictEqual(gif.usesTransparency, true);
            const frameDump = [
                [0, 0, 480, 693, 10, false, 1],
                [208, 405, 130, 111, 10, false, 1],
                [85, 0, 395, 516, 10, false, 1],
                [85, 0, 395, 309, 10, false, 1],
                [85, 0, 395, 309, 10, false, 1],
                [85, 0, 395, 309, 10, false, 1],
                [208, 0, 272, 516, 10, false, 1],
                [85, 0, 375, 516, 10, false, 1],
                [85, 2, 365, 514, 10, false, 1],
                [85, 36, 346, 480, 10, false, 1],
                [167, 79, 271, 213, 10, false, 1],
                [85, 103, 353, 413, 10, false, 1],
                [191, 142, 279, 374, 20, false, 1],
                [0, 0, 1, 1, 20, false, 1],
                [191, 142, 279, 374, 20, false, 1],
                [191, 142, 279, 374, 30, false, 1],
                [191, 142, 279, 374, 10, false, 1],
                [85, 183, 395, 211, 10, false, 1],
                [85, 183, 395, 258, 10, false, 1],
                [85, 183, 395, 333, 10, false, 1],
                [85, 183, 395, 363, 10, false, 1],
                [85, 183, 395, 405, 10, false, 1],
                [85, 183, 395, 442, 10, false, 1],
                [208, 405, 272, 284, 10, false, 1],
                [324, 499, 156, 194, 10, false, 1],
                [394, 546, 86, 147, 10, false, 1],
                [85, 183, 395, 510, 10, false, 1],
                [0, 0, 1, 1, 10, false, 1],
                [85, 183, 338, 333, 10, false, 1],
                [208, 405, 130, 111, 10, false, 1],
                [208, 247, 215, 269, 10, false, 1]
            ];
            Tools.compareToFrameDump(gif.frames, frameDump);
            Assert(Buffer.isBuffer(gif.buffer));
        });
    });
});

function _compareGifToSeries(actualGif, expectedSeries, options) {

    Assert.strictEqual(actualGif.width, expectedSeries[0].width);
    Assert.strictEqual(actualGif.height, expectedSeries[0].height);
    if (options.loops === undefined) {
        Assert.strictEqual(actualGif.loops, 0);
    }
    else {
        Assert.strictEqual(actualGif.loops, options.loops);
    }
    if (options.usesTransparency !== undefined) {
        Assert.strictEqual(actualGif.usesTransparency,
                options.usesTransparency);
    }
    if (options.optionization !== undefined) {
        Assert.strictEqual(actualGif.optionization, options.optionization);
    }

    Assert(Array.isArray(actualGif.frames));
    Assert.strictEqual(actualGif.frames.length, expectedSeries.length);
    for (let i = 0; i < actualGif.frames.length; ++i) {
        const f = actualGif.frames[i];
        Tools.checkFrameDefaults(f, options, i);
        Assert.deepStrictEqual(f.bitmap, expectedSeries[i],
                `frame ${i} same bitmap`);
    }
    Assert(Buffer.isBuffer(actualGif.buffer)); 
}
