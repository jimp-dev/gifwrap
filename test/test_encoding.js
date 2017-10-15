'use strict';

const Assert = require('assert');
const Tools = require('./lib/tools');
const { Gif, GifFrame, GifCodec, GifUtil, GifError } = require('../src/index');

// compare decoded encodings with decodings intead of comparing buffers, because there are many ways to encode the same data

const defaultCodec = new GifCodec();

describe("single-frame encoding", () => {

    it("encodes an opaque monochrome GIF", () => {

        const name = 'singleFrameMonoOpaque';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a transparent GIF", () => {

        const name = 'singleFrameNoColorTrans';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a monochrome GIF with transparency", () => {

        const name = 'singleFrameMonoTrans';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a opaque two-color GIF", () => {

        const name = 'singleFrameBWOpaque';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a opaque multi-color GIF", () => {

        const name = 'singleFrameMultiOpaque';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a 4-color GIF w/ transparency", () => {

        const name = 'singleFrameMultiTrans';
        return _encodeDecodeFile(name, Gif.StoreLocal); // simple code 1st
        // .then(() => {
        //     return _encodeDecodeFile(name, Gif.StoreGlobal);
        // });
    });
});

describe("multi-frame encoding", () => {

    it("encodes a 2-frame multi-color opaque GIF", () => {

        const name = 'twoFrameMultiOpaque';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a 3-frame monocolor GIF with transparency", () => {

        const name = 'threeFrameMonoTrans';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a large multiframe file w/out transparency", () => {

        const name = 'nburling-public';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });

    it("encodes a large multiframe file w/ offsets, w/out transparency", () => {

        const name = 'rnaples-offsets-public';
        return _encodeDecodeFile(name, Gif.StoreLocal) // simple code 1st
        .then(() => {
            return _encodeDecodeFile(name, Gif.StoreGlobal);
        });
    });
});

function _compareGifs(actual, expected, filename, note) {
    note = `file '${filename}' (${note})`;
    Assert.strictEqual(actual.width, expected.width, note);
    Assert.strictEqual(actual.height, expected.height, note);
    Assert.strictEqual(actual.loops, expected.loops, note);
    Assert.strictEqual(actual.usesTransparency, expected.usesTransparency,
            note);
    if (expected.optionization !== undefined) {
        Assert.strictEqual(actual.optionization, expected.optionization, note);
    }

    Assert(Buffer.isBuffer(actual.buffer), note); 
    Assert(Array.isArray(actual.frames));
    Assert.strictEqual(actual.frames.length, expected.frames.length);
    note = ` in ${note}`;
    for (let i = 0; i < actual.frames.length; ++i) {
        const actualFrame = actual.frames[i];
        const expectedFrame = expected.frames[i];
        Tools.verifyFrameInfo(actualFrame, expectedFrame, i, note);
    }
}

function _encodeDecodeFile(filename, storage) {
    let expectedGif;
    return GifUtil.read(Tools.getGifPath(filename))
    .then(readGif => {

        expectedGif = readGif;
        const options = _getFrameOptions(readGif);
        options.storage = storage;
        return defaultCodec.encodeGif(readGif.frames, options);
    })
    .then(encodedGif => {

        _compareGifs(encodedGif, expectedGif, filename,
                `encoded == read (storage ${storage})`);
        return defaultCodec.decodeGif(encodedGif.buffer);
    })
    .then(decodedGif => {

        _compareGifs(decodedGif, expectedGif, filename,
                `decoded == read (storage ${storage})`);
    })
}

function _getFrameOptions(frame) {
    const options = Object.assign({}, frame);
    options.frames = undefined;
    options.buffer = undefined;
    return options;
}
