'use strict';

const Tools = require('./lib/tools');
const { Gif, GifFrame, GifCodec, GifUtil, GifError } = require('../src/index');
const fs = require('fs');
const path = require('path');

const defaultCodec = new GifCodec();

const name = 'singleFrameMultiTrans';
_encodeDecodeFile(name, Gif.LocalColorsOnly)
.catch(err => {
    console.log(err);
});
// .then(() => {
//     return _encodeDecodeFile(name, Gif.GlobalColorsOnly);
// });

function _encodeDecodeFile(filename, colorScope) {
    let expectedGif;
    return GifUtil.read(Tools.getGifPath(filename))
    .then(readGif => {

        expectedGif = readGif;
        const options = _getFrameOptions(readGif);
        options.colorScope = colorScope;
        return defaultCodec.encodeGif(readGif.frames, options);
    })
    .then(encodedGif => {

        // return new Promise((resolve, reject) => {
        //     const buffer = encodedGif.buffer;
        //     fs.writeFile(path.resolve(__dirname, 'output.gif'), buffer, err => {
                
        //         if (err) {
        //             return reject(err);
        //         }
        //         return resolve();
        //     });
        // });

       return defaultCodec.decodeGif(encodedGif.buffer);
    })
    .then(decodedGif => {

        console.log("MADE IT!!!");
    })
}

function _getFrameOptions(frame) {
    const options = Object.assign({}, frame);
    options.frames = undefined;
    options.buffer = undefined;
    return options;
}
