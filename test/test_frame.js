'use strict';

const assert = require('chai').assert;
const Jimp = require('jimp');
const Tools = require('./lib/tools');
const { Gif, GifFrame, GifError } = require('../src/index');

const SAMPLE_PNG_PATH = Tools.getFixturePath('lenna.png');
const SAMPLE_JPG_PATH = Tools.getFixturePath('pelagrina.jpg');

describe("Jimp construction behavior", () => {

    it("constructs an empty uncolored bitmap", (done) => {

        const f = new GifFrame(10, 5);
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("constructs an empty colored bitmap", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5, color);
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("sources from an existing Jimp image", (done) => {

        const color = 0x01020304;
        const j = new Jimp(10, 5, color);
        const f = new GifFrame(j);
        assert.notStrictEqual(f.bitmap, j.bitmap);
        assert.deepStrictEqual(f.bitmap, j.bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("constructs a png from a file", (done) => {

        const f = new GifFrame(SAMPLE_PNG_PATH, (err, image) => {
            assert.strictEqual(err, null);
            assert.strictEqual(image.bitmap.width, 512);
            assert.strictEqual(image.bitmap.height, 512);
            Tools.checkFrameDefaults(f);
            done();
        });
    });

    it("constructs a jpg from a file", (done) => {

        const f = new GifFrame(SAMPLE_JPG_PATH, (err, image) => {
            assert.strictEqual(err, null);
            assert.strictEqual(f.bitmap.width, 600);
            assert.strictEqual(f.bitmap.height, 595);
            Tools.checkFrameDefaults(f);
            done();
        });
    });
});

describe("GifFrame good construction behavior", () => {

    it("initializes options in an empty uncolored bitmap", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5);
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        assert.strictEqual(f.bitmap.data.readUInt32BE(0), 0);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes options in an empty uncolored bitmap w/ options", (done) => {

        const color = 0x01020304;
        const f = new GifFrame(10, 5, { delayCentisecs: 100 });
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        Tools.checkFrameDefaults(f, {
            delayCentisecs: 100
        });
        done();
    });

    it("initializes options in an empty colored bitmap", (done) => {

        const color = 0xff000000;
        const f = new GifFrame(10, 5, color);
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes options in an empty colored bitmap w/ options", (done) => {

        const color = 0xff000000;
        const f = new GifFrame(10, 5, color, { interlaced: true });
        assert.strictEqual(f.bitmap.width, 10);
        assert.strictEqual(f.bitmap.height, 5);
        assert.strictEqual(f.bitmap.data.readUInt32BE(0), color);
        Tools.checkFrameDefaults(f, {
            interlaced: true
        });
        done();
    });

    it("initializes data params without options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data);
        assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes data params with options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap.width, bitmap.height, bitmap.data,
                    { delayCentisecs: 200, interlaced: true });
        assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f, {
            delayCentisecs: 200,
            interlaced: true
        });
        done();
    });

    it("initializes bitmap without options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f);
        done();
    });

    it("initializes bitmap with options", (done) => {
        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap,
                    { delayCentisecs: 200, interlaced: true });
        assert.deepStrictEqual(f.bitmap, bitmap);
        Tools.checkFrameDefaults(f, {
            delayCentisecs: 200,
            interlaced: true
        });
        done();
    });

    it("clones an existing frame", (done) => {

        const f1 = new GifFrame(5, 5, {
            delayCentisecs: 100,
            isInterlace: true
        });
        f1.bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f2 = new GifFrame(f1);
        Tools.verifyFrameInfo(f2, f1);
        assert.notStrictEqual(f2.bitmap, f1.bitmap);
        assert.deepStrictEqual(f2.bitmap, f1.bitmap);
        done();
    });
});

describe("GifFrame bad construction behavior", () => {

    it("path requires a callback and nothing else", (done) => {

        assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH);
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(SAMPLE_JPG_PATH, { interlaced: true } );
        }, /unrecognized/);
        done();
    });

    it("Jimp image can't have a callback", (done) => {

        const j = new Jimp(10, 5);
        assert.throws(() => {
            new GifFrame(j, () => {});
        }, /unrecognized/);
        done();
    });

    it("width requires height", (done) => {

        assert.throws(() => {
            new GifFrame(5);
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(5, { interlaced: true });
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(5, new Buffer(5));
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(5, () => {});
        }, /unrecognized/);
        done();
    });

    it("callback can't follow width and height", (done) => {

        assert.throws(() => {
            new GifFrame(5, 5, () => {});
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(5, 5, 0xFFFFFF00, () => {});
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(5, 5, new Buffer(25), () => {});
        }, /unrecognized/);
        done();
    });
    
    it("callback can't follow bitmap", (done) => {

        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        assert.throws(() => {
            new GifFrame(bitmap, () => {});
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(bitmap, { interlaced: true }, () => {});
        }, /unrecognized/);
        done();
    });
    
    it("won't accept garbage", (done) => {

        assert.throws(() => {
            new GifFrame();
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(null);
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(() => {});
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame({});
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame({ interlaced: true });
        }, /unrecognized/);
        assert.throws(() => {
            new GifFrame(new Buffer(25));
        }, /unrecognized/);
        done();
    });
});

describe("GifFrame palette", () => {

    it("is monocolor without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoOpaque');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0xFF0000]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes two colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0x000000, 0xffffff]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes multiple colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiOpaque');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors,
                [0x0000ff, 0x00ff00, 0xff0000, 0xffffff]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("has only transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameNoColorTrans');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, []);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("is monocolor with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoTrans');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0x00ff00]);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("includes multiple colors with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiTrans');
        const f = new GifFrame(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors,
                [0x000000, 0x0000ff, 0x00ff00, 0xff0000]);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });
});

describe("Jimp behavior in frames", () => {

    it("frame.grayscale()", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiOpaque');
        const f = new GifFrame(bitmap);
        f.grayscale();
        const p = f.getPalette();
        // Notice that grayscale() is turning 0xffffff into 0xfefefe and that the same brightness in each of RGB goes to different grays.
        assert.deepStrictEqual(p.colors,
                [0x121212, 0x363636, 0xb6b6b6, 0xfefefe]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("composing with a sprite having transparency", (done) => {

        const frame = new GifFrame(Tools.getBitmap('singleFrameMonoOpaque'));
        const sprite = new GifFrame(Tools.getBitmap('sampleSprite'));
        frame.composite(sprite, 1, 1);
        const expected = new GifFrame(
                Tools.getBitmap('singleFrameMonoOpaqueSpriteAt1x1'));
        assert.deepStrictEqual(frame.bitmap, expected.bitmap);
        done();
    });
});

function _assertDefaultFrameOptions(frame) {
    assert.strictEqual(frame.xOffset, 0);
    assert.strictEqual(frame.yOffset, 0);
    assert.strictEqual(frame.disposalMethod, GifFrame.DisposeToAnything);
    assert.strictEqual(typeof frame.delayCentisecs, 'number');
    assert.strictEqual(frame.interlaced, false);
}
