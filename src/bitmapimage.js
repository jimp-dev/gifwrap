'use strict';

class BitmapImage {

    constructor(...args) {
        // don't confirm the number of args, because a subclass may have
        // additional args and pass them all to the superclass
        if (args.length === 0) {
            throw new Error("constructor requires parameters");
        }
        const firstArg = args[0];
        if (firstArg !== null && typeof firstArg === 'object') {
            if (firstArg instanceof BitmapImage) {
                // copy a provided BitmapImage
                const sourceBitmap = firstArg.bitmap;
                this.bitmap = {
                    width: sourceBitmap.width,
                    height: sourceBitmap.height,
                    data: new Buffer(sourceBitmap.width * sourceBitmap.height * 4)
                };
                sourceBitmap.data.copy(this.bitmap.data);
            }
            else if (firstArg.width && firstArg.height && firstArg.data) {
                // share a provided bitmap
                this.bitmap = firstArg;
            }
            else {
                throw new Error("unrecognized constructor parameters");
            }
        }
        else if (typeof firstArg === 'number' && typeof args[1] === 'number')
        {
            const width = firstArg;
            const height = args[1];
            const thirdArg = args[2];
            this.bitmap = { width, height };

            if (Buffer.isBuffer(thirdArg)) {
                this.bitmap.data = thirdArg;
            }
            else {
                this.bitmap.data = new Buffer(width * height * 4);
                if (typeof thirdArg === 'number') {
                    this.fillRGBA(thirdArg);
                }
            }
        }
        else {
            throw new Error("unrecognized constructor parameters");
        }
    }

    blit(toImage, toX, toY, fromX, fromY, fromWidth, fromHeight) {
        if (fromX + fromWidth > this.bitmap.width) {
            throw new Error("copy exceeds width of source bitmap");
        }
        if (toX + fromWidth > toImage.bitmap.width) {
            throw new Error("copy exceeds width of target bitmap");
        }
        if (fromY + fromHeight > this.bitmap.height) {
            throw new Error("copy exceeds height of source bitmap");
        }
        if (toY + fromHeight > toImage.bitmap.height) {
            throw new Erro("copy exceeds height of target bitmap");
        }
        
        const sourceBuf = this.bitmap.data;
        const targetBuf = toImage.bitmap.data;
        const sourceByteWidth = this.bitmap.width * 4;
        const targetByteWidth = toImage.bitmap.width * 4;
        const copyByteWidth = fromWidth * 4;
        let si = fromY * sourceByteWidth + fromX * 4;
        let ti = toY * targetByteWidth + toX * 4;

        while (--fromHeight >= 0) {
            sourceBuf.copy(targetBuf, ti, si, si + copyByteWidth);
            si += sourceByteWidth;
            ti += targetByteWidth;
        }
        return this;
    }

    fillRGBA(rgba) {
        const buf = this.bitmap.data;
        const bufByteWidth = this.bitmap.height * 4;
        
        let bi = 0;
        while (bi < bufByteWidth) {
            buf.writeUInt32BE(rgba, bi);
            bi += 4;
        }
        while (bi < buf.length) {
            buf.copy(buf, bi, 0, bufByteWidth);
            bi += bufByteWidth;
        }
        return this;
    }

    getRGBA(x, y) {
        const bi = (y * this.bitmap.width + x) * 4;
        return this.bitmap.data.readUInt32BE(bi);
    }

    greyscale() {
        const buf = this.bitmap.data;
        this.scan(0, 0, this.bitmap.width, this.bitmap.height, (x, y, idx) => {
            const grey = Math.round(
                0.299 * buf[idx] +
                0.587 * buf[idx + 1] +
                0.114 * buf[idx + 2]
            );
            buf[idx] = grey;
            buf[idx + 1] = grey;
            buf[idx + 2] = grey;
        });
        return this;
    }

    reframe(xOffset, yOffset, width, height, fillRGBA) {
        const cropX = (xOffset < 0 ? 0 : xOffset);
        const cropY = (yOffset < 0 ? 0 : yOffset);
        const cropWidth = (width + cropX > this.bitmap.width ?
                this.bitmap.width - cropX : width);
        const cropHeight = (height + cropY > this.bitmap.height ?
                this.bitmap.height - cropY : height);
        const newX = (xOffset < 0 ? -xOffset : 0);
        const newY = (yOffset < 0 ? -yOffset : 0);

        let image;
        if (fillRGBA === undefined) {
            if (cropX !== xOffset || cropY != yOffset ||
                    cropWidth !== width || cropHeight !== height)
            {
                throw new GifError(`fillRGBA required for this reframing`);
            }
            image = new BitmapImage(width, height);
        }
        else {
            image = new BitmapImage(width, height, fillRGBA);
        }
        image.blit(this, newX, newY, cropX, cropY, cropWidth, cropHeight);
        this.bitmap = image.bitmap;
        return this;
    }

    scale(factor, mode) {
        if (factor === 1) {
            return;
        }
        if (!Number.isInteger(factor) || factor < 1) {
            throw new Error(
                    "the scale must be an integer >= 1 when there is no mode");
        }
        const sourceWidth = this.bitmap.width;
        const sourceHeight = this.bitmap.height;
        const destByteWidth = sourceWidth * factor * 4;
        const sourceBuf = this.bitmap.data;
        const destBuf = new Buffer(sourceHeight * destByteWidth * factor);
        let sourceIndex = 0;
        let priorDestRowIndex;
        let destIndex = 0;
        for (let y = 0; y < sourceHeight; ++y) {
            priorDestRowIndex = destIndex;
            for (let x = 0; x < sourceWidth; ++x) {
                const color = sourceBuf.readUInt32BE(sourceIndex, true);
                for (let cx = 0; cx < factor; ++cx) {
                    destBuf.writeUInt32BE(color, destIndex);
                    destIndex += 4;
                }
                sourceIndex += 4;
            }
            for (let cy = 1; cy < factor; ++cy) {
                destBuf.copy(destBuf, destIndex, priorDestRowIndex, destIndex);
                destIndex += destByteWidth;
                priorDestRowIndex += destByteWidth;
            }
        }
        this.bitmap = {
            width: sourceWidth * factor,
            height: sourceHeight * factor,
            data: destBuf
        };
        return this;
    }

    scanAllCoords(scanHandler) {
        const width = this.bitmap.width;
        const bufferLength = this.bitmap.data.length;
        let x = 0;
        let y = 0;

        for (let bi = 0; bi < bufferLength; bi += 4) {
            scanHandler(x, y, bi);
            if (++x === width) {
                x = 0;
                ++y;
            }
        }
    }

    scanAllIndexes(scanHandler) {
        const bufferLength = this.bitmap.data.length;
        for (let bi = 0; bi < bufferLength; bi += 4) {
            scanHandler(bi);
        }
    }
}

module.exports = BitmapImage;
