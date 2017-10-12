'use strict';

exports.getBitmap = function (bitmapName) {
    const stringPic = PREMADE_BITMAPS[bitmapName];
    if (stringPic === undefined) {
        throw new Error(`Bitmap '${bitmapName}' not found`);
    }
    return exports.toBitmap(stringPic);
}

exports.toBitmap = function (stringPic) {
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
            if (CHAR_TO_COLOR[row[x]] !== 'undefined') {
                const color = CHAR_TO_COLOR[row[x]];
                data[offset] = (color >> 24 ) & 0xff;
                data[offset + 1] = (color >> 16 ) & 0xff;
                data[offset + 2] = (color >> 8 ) & 0xff;
                data[offset + 3] = color & 0xff;
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
        'bGb',
        'GGG'
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
    ]
};