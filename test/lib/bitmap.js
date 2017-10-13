'use strict';

const Path = require('path');

exports.getBitmap = function (bitmapName, transparentRGB) {
    const stringPic = PREMADE_BITMAPS[bitmapName];
    if (stringPic === undefined) {
        throw new Error(`Bitmap '${bitmapName}' not found`);
    }
    if (Array.isArray(stringPic[0])) {
        throw new Error(`'${bitmapName}' is a bitmap series`);
    }
    return _stringsToBitmap(stringPic, transparentRGB);
}

exports.getSeries = function (seriesName, transparentRGB) {
    const series = PREMADE_BITMAPS[seriesName];
    if (series === undefined) {
        throw new Error(`Bitmap series '${seriesName}' not found`);
    }
    if (!Array.isArray(series[0])) {
        throw new Error(`'${seriesName}' is not a bitmap series`);
    }
    return series.map(stringPic =>
            (_stringsToBitmap(stringPic, transparentRGB)));
}

function _stringsToBitmap(stringPic, transparentRGB) {
    const trans = transparentRGB; // shortens code, leaves parameter clear
    const width = stringPic[0].length;
    const height = stringPic.length;
    const data = new Buffer(width * height * 4);
    let offset = 0;

    for (let y = 0; y < height; ++y) {
        const row = stringPic[y];
        if (row.length !== width) {
            throw new Error("Inconsistent pixel string length");
        }
        for (let x = 0; x < width; ++x) {
            if (CHAR_TO_COLOR[row[x]] !== undefined) {
                const color = CHAR_TO_COLOR[row[x]];
                const alpha = color & 0xff;
                if (alpha === 255 || trans === undefined) {
                    data[offset] = (color >> 24) & 0xff;
                    data[offset + 1] = (color >> 16) & 0xff;
                    data[offset + 2] = (color >> 8) & 0xff;
                    data[offset + 3] = color & 0xff;
                }
                else {
                    // not concerned about speed
                    data[offset] = (trans >> 16) & 0xff;
                    data[offset + 1] = (trans >> 8) & 0xff;
                    data[offset + 2] = trans & 0xff;
                    data[offset + 3] = 0;
                }
                offset += 4;
            }
            else {
                const validChars = Object.keys(CHAR_TO_COLOR).join('');
                throw new Error(`Invalid pixel char '${row[x]}'. `+
                        `Valid chars are "${validChars}".`);
            }
        }
    }
    return { width, height, data };
}

exports.getFixturePath = function (filename) {
    return Path.join(__dirname, "../fixtures", filename);
}

exports.getGifPath = function (filenameMinusExtension) {
    return exports.getFixturePath(filenameMinusExtension + '.gif');
}

const CHAR_TO_COLOR = {
    'R': 0xFF0000ff, // red
    'r': 0xFF00007f, // red half-alpha
    'G': 0x00FF00ff, // green
    'g': 0x00FF007f, // green half-alpha
    'B': 0x0000FFff, // blue
    'b': 0x0000FF7f, // blue half-alpha
    '*': 0x000000ff, // black
    ' ': 0x00000000, // black transparent
    'W': 0xFFFFFFff, // white
    '_': 0xFFFFFF01,  // white transparent
    '4': 0x404040ff, // dark grey
    '9': 0x909090ff  // light grey
};

const PREMADE_BITMAPS = {

    singleFrameMonoOpaque: [
        'RRR',
        'RRR',
        'RRR'
    ],

    singleFrameNoColorTrans: [
        'rrr',
        'rrr',
        'rrr'
    ],

    singleFrameMonoTrans: [
        'bGb',
        'GGG',
        'bGb'
    ],

    singleFrameBWOpaque: [
        '*WW*',
        'W**W',
        '*WW*'
    ],

    singleFrameMultiOpaque: [
        'RGBW',
        'WRGB'
    ],

    singleFrameMultiTrans: [
        'RGB ',
        '_RGB',
        'rgb*'
    ],

    twoFrameMultiOpaque: [
        ['**RR',
         'GG**',
         '**BB'],
        ['RR**',
         '**GG',
         'BB**']
    ],

    threeFrameMonoTrans: [
        ['*  ',
         '   ',
         '   '],
        ['   ',
         ' * ',
         '   '],
        ['   ',
         '   ',
         '  *']
    ]
};