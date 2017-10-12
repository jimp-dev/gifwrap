
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
    optimization?: 1 | 2 | 3;
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

    static read(source: string|Buffer, decoder?: GifDecoder): Promise<Gif>;
    static setDefaultDecoder(decoder: GifDecoder): void;
    static setDefaultEncoder(encoder: GifEncoder): void;
    static write(path: string, expectGifSuffix?: boolean, frames: Frame[], spec?: GifSpec): Promise<Gif>;
}

interface GifFrameOptions {
    delayHundreths: number;
    isInterlaced: boolean;
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

    constructor(width: number, height: number, backgroundColor?: number, options?: GifFrameOptions);
    constructor(width: number, height: number, buffer: Buffer, options?: GifFrameOptions);
    constructor(path: string, callback?: JimpCallback);
    constructor(image: Jimp);
    constructor(frame: GifFrame);
    constructor(bitmap: BitmapSpec, options?: GifFrameOptions);

    getDelay(): number;
    getPixelBuffer(): Buffer;
    isInterlaced(): boolean;
    makePalette(): GifPalette;
    setDelay(hundrethsSec: number): void;
    setInterlaced(isInterlaced: boolean): void;
}

interface GifCodecOptions {
    transparentColor?: number;
}

declare class GifCodec implements GifEncoder, GifDecoder {

    constructor(options?: GifCodecOptions);
}

declare class GifError extends Error {

    constructor(message: string);
}
