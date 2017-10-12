'use strict';

const Jimp = require('jimp');
const RBTree = require('bintrees').RBTree;

class GifFrame extends Jimp {

    // _gifDelayHundreths - duration of frame in hundreths of a second
    // _gifIsInterlaced - whether the image is interlaced

    constructor(...args) {
        if (args[0] instanceof GifFrame) {
            const sourceFrame = args[0];
            super(sourceFrame);
            this._gifDelayHundreths = sourceFrame._gifDelayHundreths;
            this._gifIsInterlaced = sourceFrame._gifIsInterlaced;
        }
        else {
            // Jimp is throwing undefined when the constructor parameters are wrong, so we'll enforce valid parameters here.
            let options = {};
            if (typeof args[0] === 'string' && typeof args[1] === 'function' &&
                    args.length === 2)
            {
                super(...args);
            }
            else if (args[0] instanceof Jimp && args.length === 1) {
                super(args[0]);
            }
            else if (typeof args[0] === 'number' &&
                        typeof args[1] === 'number')
            {
                if (Buffer.isBuffer(args[2])) {
                    let argCount = 3;
                    if (typeof args[3] === 'object') {
                        options = args[3];
                        argCount = 4;
                    }
                    if (args.length > argCount) {
                        _throwBadConstructor();
                    }
                    super(2, 2); // create a temporary dummy bitmap
                    this.bitmap = {
                        width: args[0],
                        height: args[1],
                        data: args[2]
                    };
                }
                else {
                    const argCount = (typeof args[2] === 'number' ? 3 : 2);
                    if (typeof args[argCount] === 'object') {
                        options = args[argCount];
                        args.splice(argCount, 1);
                    }
                    if (args.length > argCount) {
                        _throwBadConstructor();
                    }
                    super(...args);
                }
            }
            else if (args[0] !== null && typeof args[0] === 'object' &&
                    args[0].width && args[0].height && args[0].data)
            {
                let argCount = 1;
                if (typeof args[1] === 'object') {
                    options = args[1];
                    argCount = 2;
                }
                if (args.length > argCount) {
                    _throwBadConstructor();
                }
                super(2, 2); // create a temporary dummy bitmap
                this.bitmap = args[0];
            }
            else {
                _throwBadConstructor();
            }
            this._gifDelayHundreths = options.delayHundreths || 10;
            this._gifIsInterlaced = options.isInterlaced || false;
        }
    }
    
    getDelay() {
        return this._gifDelayHundreths;
    }

    isInterlaced() {
        return this._gifIsInterlaced;
    }

    makePalette() {
        // returns palette with colors sorted low to high
        const tree = new RBTree((a, b) => (a - b));
        const buf = this.bitmap.data;
        let i = 0;
        let color;
        let usesTransparency = false;
        while (i < buf.length) {
            if (buf[i + 3] < 255) {
                usesTransparency = true;
            }
            else {
                color = (buf[i] << 16) + (buf[i + 1] << 8) + buf[i + 2];
                if (tree.find(color) === null) {
                    tree.insert(color);
                }
            }
            i += 4; // skip alpha
        }
        const colors = Array(tree.size);
        const iter = tree.iterator();
        for (i = 0; i < colors.length; ++i) {
            colors[i] = iter.next();
        }
        return { colors, usesTransparency };
    }

    setDelay(hundrethsSec) {
        this._gifDelayHundreths = hundrethsSec;
    }

    setInterlaced(isInterlaced) {
        this._gifIsInterlaced = isInterlaced;
    }
}
exports.GifFrame = GifFrame;

function _throwBadConstructor() {
    throw new Error("unrecognized constructor parameterization");
}

/*
The current release of Jimp (0.2.28) does not make this available.

Jimp.appendConstructorOption('gifwrap-frame', (...args) => {

    return (args.length === 0);
}, jimpFrameConstructor);

function jimpFrameConstructor(resolve, reject) {
    // GifFrame sets up bitmap on return from super()
    resolve();
}
*/
