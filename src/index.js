'use strict';

const { Gif, GifError } = require('./gif');
const { GifCodec } = require('./gifcodec');
const { GifFrame } = require('./gifframe');
const GifUtil = require('./gifutil');

module.exports = {
    Gif,
    GifCodec,
    GifFrame,
    GifUtil,
    GifError
};
