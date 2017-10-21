import * as Jimp from 'jimp';

type JimpCallback = (err: Error, image: Jimp) => void;

export interface GifSpec {

    width?: number;
    height?: number;
    loops?: number;
    usesTransparency?: boolean;
    colorScope?: 0|1|2;
}

export interface GifEncoder {
    encodeGif(frames: GifFrame[], spec: GifSpec): Promise<Gif>;
}

export interface GifDecoder {
    decodeGif(buffer: Buffer): Promise<Gif>;
}

export class Gif implements GifSpec {

    static readonly GlobalColorsPreferred: 0;
    static readonly GlobalColorsOnly: 1;
    static readonly LocalColorsOnly: 2;

    width?: number;
    height?: number;
    loops?: number;
    usesTransparency?: boolean;
    colorScope?: 0|1|2;
    
    frames: GifFrame[];
    buffer: Buffer;

    constructor(frames: GifFrame[], buffer: Buffer, spec?: GifSpec);
}

export interface GifFrameOptions {
    xOffset?: number;
    yOffset?: number;
    disposalMethod?: 0|1|2|3;
    delayCentisecs?: number;
    isInterlaced?: boolean;
}

export interface BitmapSpec {
    width: number;
    height: number;
    data: Buffer;
}

export interface GifPalette {
    colors: number[];
    indexCount: number;
    usesTransparency: boolean;
}

export class GifFrame extends Jimp implements GifFrameOptions {

    static readonly DisposeToAnything: 0;
    static readonly DisposeNothing: 1;
    static readonly DisposeToBackgroundColor: 2;
    static readonly DisposeToPrevious: 3;

    xOffset: number;
    yOffset: number;
    disposalMethod: 0|1|2|3;
    delayCentisecs: number;
    interlaced: boolean;

    constructor(width: number, height: number, backgroundRGBA?: number, options?: GifFrameOptions);
    constructor(width: number, height: number, buffer: Buffer, options?: GifFrameOptions);
    constructor(path: string, callback?: JimpCallback);
    constructor(image: Jimp);
    constructor(frame: GifFrame);
    constructor(bitmap: BitmapSpec, options?: GifFrameOptions);

    getPalette(): GifPalette;
    reframe(xOffset: number, yOffset: number, width: number, height: number, fillRGBA?: number) : void;
}

export interface GifCodecOptions {
    transparentRGB?: number;
}

export class GifCodec implements GifEncoder, GifDecoder {

    constructor(options?: GifCodecOptions);

    encodeGif(frames: GifFrame[], spec: GifSpec): Promise<Gif>;
    decodeGif(buffer: Buffer): Promise<Gif>;
}

export class GifError extends Error {

    constructor(message: string);
}

export interface GifUtilConfig {
    decoder?: GifDecoder;
    encoder?: GifEncoder;
}

export class GifUtil {

    static getColorInfo(frames: GifFrame[], maxGlobalIndex?: number): {
        colors?: number[],
        indexCount?: number,
        usesTransparency: boolean,
        palettes: GifPalette[]
    }
    static read(source: string|Buffer, decoder?: GifDecoder): Promise<Gif>;
    static write(path: string, frames: GifFrame[], spec?: GifSpec, encoder?: GifEncoder): Promise<Gif>;
}
