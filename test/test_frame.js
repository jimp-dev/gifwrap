'use strict';

const Assert = require('assert');
const Jimp = require('jimp');
const Tools = require('./lib/tools');
const { Gif, GifFrame, GifError } = require('../src/index');

const SAMPLE_PNG_PATH = Tools.getFixturePath('lenna.png');
const SAMPLE_JPG_PATH = Tools.getFixturePath('pelagrina.jpg');

describe("Jimp construction behavior", () => {

    it("constructs an empty uncolored bitmap", (done) => {

        const f = new GifFrame(10, 5);
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("constructs an empty colored bitmap", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5, color);
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("sources from an existing Jimp image", (done) => {

        const color = 0x01020304;
        const j = new Jimp(10, 5, color);
        const f = new GifFrame(j);
        Assert.notStrictEqual(f.bitmap, j.bitmap);
        Assert.deepStrictEqual(f.bitmap, j.bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("constructs a png from a file", (done) => {

        const f = new GifFrame(SAMPLE_PNG_PATH, (err, image) => {
            Assert.strictEqual(err, null);
            Assert.strictEqual(image.bitmap.width, 512);
            Assert.strictEqual(image.bitmap.height, 512);
            Tools.checkFrameDefaults(f);
            done();
        });
    });

    it("constructs a jpg from a file", (done) => {

        const f = new GifFrame(SAMPLE_JPG_PATH, (err, image) => {
            Assert.strictEqual(err, null);
            Assert.strictEqual(f.bitmap.width, 600);
            Assert.strictEqual(f.bitmap.height, 595);
            Tools.checkFrameDefaults(f);
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
        Tools.checkFrameDefaults(f, {
            delayHundreths: 100
        });
        done();
    });

    it("initializes options in an empty colored bitmap", (done) => {

        const color = 0xff000000;
        const f = new GifFrame(10, 5, color, { interlaced: true });
        Assert.strictEqual(f.bitmap.width, 10);
        Assert.strictEqual(f.bitmap.height, 5);
        Assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Tools.checkFrameDefaults(f, {
            interlaced: true
        });
        done();
    });

    it("initializes data params without options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data);
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes data params with options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data,
                    { delayHundreths: 200, interlaced: true });
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f, {
            delayHundreths: 200,
            interlaced: true
        });
        done();
    });

    it("initializes bitmap without options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes bitmap with options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap,
                    { delayHundreths: 200, interlaced: true });
        Assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f, {
            delayHundreths: 200,
            interlaced: true
        });
        done();
    });

    it("clones an existing frame", (done) => {

        const f1 = new GifFrame(5, 5, {
            delayHundreths: 100,
            isInterlace: true
        });
        f1.bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f2 = new GifFrame(f1);
        Tools.verifyFrameInfo(f2, f1);
        Assert.notStrictEqual(f2.bitmap, f1.bitmap);
        Assert.deepStrictEqual(f2.bitmap, f1.bitmap);
        done();
    });
});

describe("GifFrame bad construction behavior", () => {

    it("path requires a callback and nothing else", (done) => {

        Assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH);
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH, { interlaced: true } );
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
            new GifFrame(5, { interlaced: true });
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

        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        Assert.throws(() => {
            new GifFrame(bitmap, () => {});
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(bitmap, { interlaced: true }, () => {});
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
            new GifFrame({ interlaced: true });
        }, /unrecognized/);
        Assert.throws(() => {
            new GifFrame(new Buffer(25));
        }, /unrecognized/);
        done();
    });
});

describe("GifFrame palette", () => {

    it("is monocolor without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0xFF0000]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes two colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0x000000, 0xffffff]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes multiple colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiOpaque');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors,
                [0x0000ff, 0x00ff00, 0xff0000, 0xffffff]);
        Assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("has only transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameNoColorTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, []);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("is monocolor with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors, [0x00ff00]);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("includes multiple colors with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiTrans');
        const f = new GifFrame(bitmap);
        const p = f.makePalette();
        Assert.deepStrictEqual(p.colors,
                [0x000000, 0x0000ff, 0x00ff00, 0xff0000]);
        Assert.strictEqual(p.usesTransparency, true);
        done();
    });
});

function _assertDefaultFrameOptions(frame) {
    Assert.strictEqual(frame.xOffset, 0);
    Assert.strictEqual(frame.yOffset, 0);
    Assert.strictEqual(frame.disposalMethod, GifFrame.DisposeToAnything);
    Assert.strictEqual(typeof frame.delayHundreths, 'number');
    Assert.strictEqual(frame.interlaced, false);
}
