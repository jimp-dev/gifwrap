'use strict';

const Assert = require('assert');
const Jimp = require('jimp');
const Bitmap = require('./lib/bitmap');
const { Gif, GifFrame, GifError } = require('../src/index');

const SAMPLE_PNG_PATH = Bitmap.getFixturePath('lenna.png');
const SAMPLE_JPG_PATH = Bitmap.getFixturePath('pelagrina.jpg');

describe("Jimp construction behavior", () => {

    it("constructs an empty uncolored bitmap", (done) => {

        const f = new GifFrame(10, 5);
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        _assertDefaultFrameOptions(f);
        done();
    });

    it("constructs an empty colored bitmap", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5, color);
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        _assertDefaultFrameOptions(f);
        done();
    });

    it("sources from an existing Jimp image", (done) => {

        const color = 0x01020304;
        const j = new Jimp(10, 5, color);
        const f = new GifFrame(j);
        Assert.notStrictEqual(f.bitmap, j.bitmap);
        Assert.deepStrictEqual(f.bitmap, j.bitmap);
        _assertDefaultFrameOptions(f);
        done();
    });

    it("constructs a png from a file", (done) => {

        const f = new GifFrame(SAMPLE_PNG_PATH, (err, image) => {
            Assert.strictEqual(err, null);
            Assert.strictEqual(image.bitmap.width, 512);
            Assert.strictEqual(image.bitmap.height, 512);
            _assertDefaultFrameOptions(f);
            done();
        });
    });

    it("constructs a jpg from a file", (done) => {

        const f = new GifFrame(SAMPLE_JPG_PATH, (err, image) => {
            Assert.strictEqual(err, null);
            Assert.strictEqual(f.bitmap.width, 600);
            Assert.strictEqual(f.bitmap.height, 595);
            _assertDefaultFrameOptions(f);
            done();
        });
    });
});

describe("GifFrame good construction behavior", () => {

    it("initializes options in an empty uncolored bitmap", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5, { delayHundreths: 100 });
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Assert.strictEqual(f.delayHundreths, 100);
        Assert.strictEqual(f.isInterlaced, false);
        done();
    });

    it("initializes options in an empty colored bitmap", (done) => {

        const color = 0xff000000;
        const f = new GifFrame(10, 5, color, { isInterlaced: true });
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Assert.strictEqual(f.isInterlaced, true);
        done();
    });

    it("initializes data params without options", (done) => {
        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data);
        Assert.deepStrictEqual(f.bitmap, bitmap);
        _assertDefaultFrameOptions(f);
        done();
    });

    it("initializes data params with options", (done) => {
        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data,
                    { delayHundreths: 200, isInterlaced: true });
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Assert.strictEqual(f.delayHundreths, 200);
        Assert.strictEqual(f.isInterlaced, true);
        done();
    });

    it("initializes bitmap without options", (done) => {
        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        Assert.deepStrictEqual(f.bitmap, bitmap);
        _assertDefaultFrameOptions(f);
        done();
    });

    it("initializes bitmap with options", (done) => {
        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap,
                    { delayHundreths: 200, isInterlaced: true });
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Assert.strictEqual(f.delayHundreths, 200);
        Assert.strictEqual(f.isInterlaced, true);
        done();
    });

    it("clones an existing frame", (done) => {

        const f1 = new GifFrame(5, 5, {
            delayHundreths: 100,
            isInterlace: true
        });
        f1.bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f2 = new GifFrame(f1);
        Assert.notStrictEqual(f2.bitmap, f1.bitmap);
        Assert.deepStrictEqual(f2.bitmap, f1.bitmap);
        Assert.equal(f2.delayHundreths, f1.delayHundreths);
        Assert.equal(f2.isInterlaced, f1.isInterlaced);
        done();
    });
});

describe("GifFrame bad construction behavior", () => {

    it("path requires a callback and nothing else", (done) => {

        Assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH);
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH, { isInterlaced: true } );
        }, /unrecognized/);
        done();
    });

    it("Jimp image can't have a callback", (done) => {

        const j = new Jimp(10, 5);
        Assert.throws(() => {
            new GifFrame(j, () => {});
        }, /unrecognized/);
        done();
    });

    it("width requires height", (done) => {

        Assert.throws(() => {
            new GifFrame(5);
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(5, { isInterlaced: true });
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(5, new Buffer(5));
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(5, () => {});
        }, /unrecognized/);
        done();
    });

    it("callback can't follow width and height", (done) => {

        Assert.throws(() => {
            new GifFrame(5, 5, () => {});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(5, 5, 0xFFFFFF00, () => {});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(5, 5, new Buffer(25), () => {});
        }, /unrecognized/);
        done();
    });
    
    it("callback can't follow bitmap", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        Assert.throws(() => {
            new GifFrame(bitmap, () => {});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(bitmap, { isInterlaced: true }, () => {});
        }, /unrecognized/);
        done();
    });
    
    it("won't accept garbage", (done) => {

        Assert.throws(() => {
            new GifFrame();
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(null);
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(() => {});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame({});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame({ isInterlaced: true });
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(new Buffer(25));
        }, /unrecognized/);
        done();
    });
});

describe("GifFrame palette", () => {

    it("is monocolor without transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameMonoOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0xFF0000]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes two colors without transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0x000000, 0xffffff]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes multiple colors without transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameMultiOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors,
                [0x0000ff, 0x00ff00, 0xff0000, 0xffffff]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("has only transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameNoColorTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, []);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("is monocolor with transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameMonoTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0x00ff00]);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("includes multiple colors with transparency", (done) => {

        const bitmap = Bitmap.getBitmap('singleFrameMultiTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors,
                [0x000000, 0x0000ff, 0x00ff00, 0xff0000]);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });
});

function _assertDefaultFrameOptions(frame) {
    Assert.strictEqual(typeof frame.delayHundreths, 'number');
    Assert.strictEqual(frame.isInterlaced, false);
}
