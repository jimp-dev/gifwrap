'use strict';

const Assert = require('assert');
const Jimp = require('jimp');
const Bitmap = require('./lib/bitmap');
const { Gif, GifFrame, GifCodec, GifUtil, GifError } = require('../src/index');

describe("single frame decoding", () => {

    it("reads an opaque monocolor file", () => {

        const name = 'singleFrameMonoOpaque';
        const bitmap = Bitmap.getBitmap(name);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: false
            });
        });
    });

    it("reads an opaque multi-color file", () => {

        const name = 'singleFrameMultiOpaque';
        const bitmap = Bitmap.getBitmap(name);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: false
            });
        });
    });

    it("reads a purely transparent file", () => {

        const name = 'singleFrameNoColorTrans';
        const bitmap = Bitmap.getBitmap(name, 0);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: true
            });
        });
    });

    it("reads a monochrome file with transparency", () => {

        const name = 'singleFrameMonoTrans';
        const bitmap = Bitmap.getBitmap(name, 0);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: true
            });
        });
    });

    it("reads a multicolor file with transparency", () => {

        const name = 'singleFrameMultiTrans';
        const bitmap = Bitmap.getBitmap(name, 0);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: true
            });
        });
    });

    it("reads a multicolor file with custom transparency color", () => {

        const transRGB = 0x123456;
        const name = 'singleFrameMultiTrans';
        const bitmap = Bitmap.getBitmap(name, transRGB);
        const gifUtil = GifUtil.create({
            decoder: new GifCodec({ transparentRGB: transRGB })
        });
        return gifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, [bitmap], {
                loops: 0,
                usesTransparency: true
            });
        });
    });
});

describe("multiframe decoding", () => {

    it("reads a 2-frame multicolor file without transparency", () => {

        const name = 'twoFrameMultiOpaque';
        const series = Bitmap.getSeries(name);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, series, {
                loops: 0,
                usesTransparency: false,
                delayHundreths: 50
            });
        });
    });

    it("reads a 3-frame monocolor file with transparency", () => {

        const name = 'threeFrameMonoTrans';
        const series = Bitmap.getSeries(name);
        return GifUtil.read(Bitmap.getGifPath(name))
        .then(gif => {

            _compareGifs(gif, series, {
                loops: 0,
                usesTransparency: true,
                delayHundreths: 25
            });
        });
    });

    it("reads a large multiframe file w/out transparency", () => {

        return GifUtil.read(Bitmap.getGifPath('nburling-public'))
        .then(gif => {

            Assert.strictEqual(gif.width, 238);
            Assert.strictEqual(gif.height, 372);
            Assert.strictEqual(gif.loops, 0);
            Assert.strictEqual(gif.usesTransparency, false);
            Assert(Array.isArray(gif.frames));
            Assert.strictEqual(gif.frames.length, 24);
            Assert(Buffer.isBuffer(gif.buffer)); 
        });
    });

    it("reads a large multiframe file w/ offsets, w/out transparency", () => {

        return GifUtil.read(Bitmap.getGifPath('rnaples-offsets-public'))
        .then(gif => {

            Assert.strictEqual(gif.width, 480);
            Assert.strictEqual(gif.height, 693);
            Assert.strictEqual(gif.loops, 0);
            Assert.strictEqual(gif.usesTransparency, true);
            Assert(Array.isArray(gif.frames));
            Assert.strictEqual(gif.frames.length, 31);
            Assert(Buffer.isBuffer(gif.buffer));
            const measures = gif.frames.map(f =>
                    ([f.bitmap.width, f.bitmap.height, f.xOffset, f.yOffset]));
            Assert.deepStrictEqual(measures, [
                [480,693,0,0], [130,111,208,405], [395,516,85,0],
                [395,309,85,0], [395,309,85,0], [395,309,85,0],
                [272,516,208,0], [375,516,85,0], [365,514,85,2],
                [346,480,85,36], [271,213,167,79], [353,413,85,103],
                [279,374,191,142], [1,1,0,0], [279,374,191,142],
                [279,374,191,142], [279,374,191,142], [395,211,85,183],
                [395,258,85,183], [395,333,85,183], [395,363,85,183],
                [395,405,85,183], [395,442,85,183], [272,284,208,405],
                [156,194,324,499], [86,147,394,546], [395,510,85,183],
                [1,1,0,0], [338,333,85,183], [130,111,208,405],
                [215,269,208,247]
            ]);
        });
    });
});

function _compareGifs(actualGif, expectedSeries, options) {

    Assert.strictEqual(actualGif.width, expectedSeries[0].width);
    Assert.strictEqual(actualGif.height, expectedSeries[0].height);
    if (options.loops !== undefined) {
        Assert.strictEqual(actualGif.loops, options.loops);
    }
    if (options.usesTransparency !== undefined) {
        Assert.strictEqual(actualGif.usesTransparency,
                options.usesTransparency);
    }
    Assert(Array.isArray(actualGif.frames));
    Assert.strictEqual(actualGif.frames.length, expectedSeries.length);
    Assert(Buffer.isBuffer(actualGif.buffer)); 

    const frames = actualGif.frames;
    for (let i = 0; i < frames.length; ++i) {
        const f = frames[i];
        const expectedBitmap = expectedSeries[i];
        Assert.deepStrictEqual(f.bitmap, expectedBitmap,
                `frame ${i} same bitmap`);
        if (options.delayHundreths !== undefined) {
            Assert.strictEqual(f.delayHundreths, options.delayHundreths,
                    `frame ${i} same delay`);
        }
        Assert.strictEqual(f.isInterlaced, (options.isInterlaced === true),
                `frame ${i} same interlacing`);
    }
}
