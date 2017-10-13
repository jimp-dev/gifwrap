
import Jimp from 'jimp';

type JimpCallback = (err: Error, image: Jimp) => void;

interface GifSpec {

    static readonly OptimizeForSpeed: 1;
    static readonly OptimizeForSize: 2;
    static readonly OptimizeForBoth: 3;

    width?: number;
    height?: number;
    loops?: number;
    usesTransparency?: boolean;
    optimization?: 1|2|3;
}

interface GifEncoder {
    encodeGif(frames: Frame[], spec: GifSpec): Promise<Gif>;
}

interface GifDecoder {
    decodeGif(buffer: Buffer): Promise<Gif>;
}

declare class Gif implements GifSpec {

    frames: Frame[];
    buffer: Buffer;

    constructor(frames: Frame[], buffer: Buffer, spec?: GifSpec);
}

interface GifFrameOptions {
    xOffset?: number;
    yOffset?: number;
    disposalMethod?: 0|1|2|3;
    delayHundreths?: number;
    isInterlaced?: boolean;
}

interface BitmapSpec {
    width: number;
    height: number;
    data: Buffer;
}

interface GifPalette {
    colors: number[];
    usesTransparency: boolean;
}

declare class GifFrame extends Jimp {

    static readonly DisposeToAnything: 0;
    static readonly DisposeNothing: 1;
    static readonly DisposeToBackground: 2;
    static readonly DisposeToPrevious: 3;

    xOffset: number;
    yOffset: number;
    disposalMethod: 0|1|2|3;
    delayHundreths: number;
    isInterlaced: boolean;

    constructor(width: number, height: number, backgroundColor?: number, options?: GifFrameOptions);
    constructor(width: number, height: number, buffer: Buffer, options?: GifFrameOptions);
    constructor(path: string, callback?: JimpCallback);
    constructor(image: Jimp);
    constructor(frame: GifFrame);
    constructor(bitmap: BitmapSpec, options?: GifFrameOptions);

    getPixelBuffer(): Buffer;
    makePalette(): GifPalette;
}

interface GifCodecOptions {
    transparentRGB?: number;
}

declare class GifCodec implements GifEncoder, GifDecoder {

    constructor(options?: GifCodecOptions);
}

declare class GifError extends Error {

    constructor(message: string);
}

interface GifUtilConfig {
    decoder?: GifDecoder;
    encoder?: GifEncoder;
}

declare class GifUtil {

    constructor(options: GifUtilConfig);

    create(options: GifUtilConfig): GifUtil;
    read(source: string|Buffer): Promise<Gif>;
    write(path: string, frames: Frame[], spec?: GifSpec): Promise<Gif>;
}
