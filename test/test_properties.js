'use strict';

const assert = require('chai').assert;
const Tools = require('./lib/tools');
const { Gif, GifFrame, GifCodec, GifUtil, GifError } = require('../src/index');

const defaultCodec = new GifCodec();

describe("Gif width/height", () => {

    it("accepts width/height = size of the frames", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w, h),
            new GifFrame(w, h, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.strictEqual(gif.width, w);
            assert.strictEqual(gif.height, h);
        });
    });

    it("accepts width/height = size of largest frame", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w - 1, h - 1),
            new GifFrame(w, h, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.strictEqual(gif.width, w);
            assert.strictEqual(gif.height, h);
        });
    });

    it("accepts width/height = largest frame boundary", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w - 1, h - 1, {
                xOffset: 1,
                yOffset: 1
            }),
            new GifFrame(w, h, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.strictEqual(gif.width, w);
            assert.strictEqual(gif.height, h);
        });
    });

    it("rejects width < width of largest frame", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w, h),
            new GifFrame(w + 1, h, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.fail("shouldn't encode too-small width");
        })
        .catch(err => {
            if (!(err instanceof GifError)) {
                throw err;
            }
            assert.match(err.message, /< largest frame/);
        });
    });

    it("rejects height < height of largest frame", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w, h),
            new GifFrame(w, h + 1, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.fail("shouldn't encode too-small height");
        })
        .catch(err => {
            if (!(err instanceof GifError)) {
                throw err;
            }
            assert.match(err.message, /< largest frame/);
        });
    });

    it("rejects width > largest frame boundary", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w, h),
            new GifFrame(w + 2, h, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.fail("shouldn't encode too-large x boundary");
        })
        .catch(err => {
            if (!(err instanceof GifError)) {
                throw err;
            }
            assert.match(err.message, /< largest frame/);
        });
    });

    it("rejects height > largest frame boundary", () => {

        const w = 24, h = 10;
        const frames = [
            new GifFrame(w, h),
            new GifFrame(w, h + 2, 0xffffffff)
        ];
        return defaultCodec.encodeGif(frames, {
            width: w,
            height: h
        })
        .then(gif => {
            assert.fail("shouldn't encode too-large y boundary");
        })
        .catch(err => {
            if (!(err instanceof GifError)) {
                throw err;
            }
            assert.match(err.message, /< largest frame/);
        });
    });
});

describe("Gif loop count", () => {

    it("decodes an infinite loop", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay0'))
        .then(gif => {

            assert.strictEqual(gif.loops, 0);
        });
    });

    it("decodes a single-pass loop", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay1'))
        .then(gif => {

            assert.strictEqual(gif.loops, 1);
        });
    });

    it("decodes a three-pass loop", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay3'))
        .then(gif => {

            assert.strictEqual(gif.loops, 3);
        });
    });

    it("encodes an infinite loop", () => {

        return _verifyEncodesLoopCount('countConstantDelay3', 0);
    });

    it("encodes a single-pass loop", () => {

        return _verifyEncodesLoopCount('countConstantDelay0', 1);
    });

    it("encodes a three-pass loop", () => {

        return _verifyEncodesLoopCount('countConstantDelay1', 3);
    });
});

describe("Gif transparency", () => {

    it("indicate/accepts no transparency", () => {

        return GifUtil.read(Tools.getGifPath('twoFrameMultiOpaque'))
        .then(readGif => {

            assert.strictEqual(readGif.usesTransparency, false);
            const spec = Tools.getGifSpec(readGif);
            spec.usesTransparency = false;
            return defaultCodec.encodeGif(readGif.frames, spec);
        })
        .then(encodedGif => {

            assert.strictEqual(encodedGif.usesTransparency, false);
        })
    });

    it("indicates/accepts transparency", () => {

        return GifUtil.read(Tools.getGifPath('threeFrameMonoTrans'))
        .then(readGif => {

            assert.strictEqual(readGif.usesTransparency, true);
            const spec = Tools.getGifSpec(readGif);
            spec.usesTransparency = true;
            return defaultCodec.encodeGif(readGif.frames, spec);
        })
        .then(encodedGif => {

            assert.strictEqual(encodedGif.usesTransparency, true);
        })
    });

    it("rejects no-transparency indication when transparent", () => {

        return GifUtil.read(Tools.getGifPath('threeFrameMonoTrans'))
        .then(readGif => {

            const spec = Tools.getGifSpec(readGif);
            spec.usesTransparency = false;
            return defaultCodec.encodeGif(readGif.frames, spec);
        })
        .then(encodedGif => {

            assert.fail("no-transparency indicated when transparent");
        })
        .catch(err => {

            assert.match(err.message, /transparency/);
        })
    });

    it("rejects transparency indication when opaque", () => {

        return GifUtil.read(Tools.getGifPath('twoFrameMultiOpaque'))
        .then(readGif => {

            const spec = Tools.getGifSpec(readGif);
            spec.usesTransparency = true;
            return defaultCodec.encodeGif(readGif.frames, spec);
        })
        .then(encodedGif => {

            assert.fail("transparency indicated when opaque");
        })
        .catch(err => {

            assert.match(err.message, /transparency/);
        })
    });
});

describe("GifFrame x/y-offsets", () => {

    it("accommodates/encodes offsets", () => {

        return GifUtil.read(Tools.getGifPath('count5x7'))
        .then(readGif => {

            const frames = readGif.frames;
            assert(frames.length >= 4, "precondition for test");
            assert.strictEqual(readGif.width, 5);
            assert.strictEqual(readGif.height, 7);
            frames.forEach(frame => {

                _verifyFrameOffsets(frame, 0, 0);
            });
            frames[1].xOffset = 1;
            frames[1].yOffset = 2;
            frames[2].xOffset = 2;
            frames[2].yOffset = 1;
            return defaultCodec.encodeGif(frames);
        })
        .then(encodedGif => {

            assert.strictEqual(encodedGif.width, 7);
            assert.strictEqual(encodedGif.height, 9);
            return defaultCodec.decodeGif(encodedGif.buffer);
        })
        .then(decodedGif => {

            assert.strictEqual(decodedGif.width, 7);
            assert.strictEqual(decodedGif.height, 9);
            const frames = decodedGif.frames;
            _verifyFrameOffsets(frames[0], 0, 0);
            _verifyFrameOffsets(frames[1], 1, 2);
            _verifyFrameOffsets(frames[2], 2, 1);
            _verifyFrameOffsets(frames[3], 0, 0);
        });
    });
});

describe("GifFrame delay", () => {

    it("confirms a constant frame-delay GIF", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay0'))
        .then(readGif => {

            readGif.frames.forEach(frame => {

                assert.strictEqual(frame.delayHundreths, 33);
            });
        });
    });

    it("confirms a variable frame-delay GIF", () => {

        return GifUtil.read(Tools.getGifPath('countIncreasingDelay'))
        .then(readGif => {

            const frames = readGif.frames;
            for (let i = 0; i < frames.length; ++i) {
                assert.strictEqual(frames[i].delayHundreths, (i + 1)*25);
            }
        });
    });

    it("encodes varying frame delays", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay0'))
        .then(readGif => {
        
            const frames = readGif.frames;
            for (let i = 0; i < frames.length; ++i) {
                frames[i].delayHundreths = (i + 1)*25;
            }
            const spec = Tools.getGifSpec(readGif);
            return defaultCodec.encodeGif(frames, spec);
        })
        .then(encodedGif => {

            return defaultCodec.decodeGif(encodedGif.buffer);
        })
        .then(decodedGif => {

            const frames = decodedGif.frames;
            for (let i = 0; i < frames.length; ++i) {
                assert.strictEqual(frames[i].delayHundreths, (i + 1)*25);
            }
        });
    });
});

describe("GifFrame disposal method", () => {

    it("encodes/decodes disposal", () => {

        return GifUtil.read(Tools.getGifPath('countConstantDelay0'))
        .then(readGif => {
        
            const frames = readGif.frames;
            assert(frames.length >= 4, "precondition for test");
            frames.forEach(frame => {

                assert.strictEqual(frame.disposalMethod,
                        GifFrame.DisposeToBackgroundColor);
            });
            for (let i = 0; i < 4; ++i) {
                frames[i].disposalMethod = i;
            }
            const spec = Tools.getGifSpec(readGif);
            return defaultCodec.encodeGif(frames, spec);
        })
        .then(encodedGif => {

            return defaultCodec.decodeGif(encodedGif.buffer);
        })
        .then(decodedGif => {

            const frames = decodedGif.frames;
            for (let i = 0; i < 4; ++i) {
                assert.strictEqual(frames[i].disposalMethod, i);
            }
        });
    });
});

function _verifyEncodesLoopCount(sourceFilename, loopCount) {
    return GifUtil.read(Tools.getGifPath(sourceFilename))
    .then(readGif => {

        const spec = Tools.getGifSpec(readGif);
        spec.loops = loopCount;
        return defaultCodec.encodeGif(readGif.frames, spec);
    })
    .then(encodedGif => {

        assert.strictEqual(encodedGif.loops, loopCount);
        return defaultCodec.decodeGif(encodedGif.buffer);
    })
    .then(decodedGif => {

        assert.strictEqual(decodedGif.loops, loopCount);
    });
}

function _verifyFrameOffsets(frame, xOffset, yOffset) {
    assert.strictEqual(frame.xOffset, xOffset);
    assert.strictEqual(frame.yOffset, yOffset);
}
