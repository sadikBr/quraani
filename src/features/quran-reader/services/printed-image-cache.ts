import { pageInk, type PrintedPage } from '../utils/printed-page';
import { svgImageUri } from '../utils/svg-image';
import { createPreparedImageCache } from './prepared-image-cache';

interface ImageCacheOptions<T> {
  sizeOf: (image: T) => number;
  read?: (key: string) => Promise<T | null>;
  write?: (image: T, key: string) => Promise<void>;
  decode: (uri: string, artwork: PrintedPage) => Promise<T>;
  prepare: <R>(work: () => R) => Promise<R>;
}

export function createPrintedImageCache<T>({ sizeOf, read, write, decode, prepare }: ImageCacheOptions<T>) {
  const memory = createPreparedImageCache(sizeOf);
  const keyFor = (artwork: PrintedPage, text: string, ornament: string) =>
    `warsh-image-v2:${artwork.cacheKey}:${text}:${ornament}:4x`;
  const peek = (artwork: PrintedPage, text: string, ornament: string) => memory.peek(keyFor(artwork, text, ornament));
  const load = (artwork: PrintedPage, text: string, ornament: string) => {
    const key = keyFor(artwork, text, ornament);
    return memory.load(key, async () => {
      const saved = await read?.(key).catch(() => null);
      if (saved) return saved;
      const uri = await prepare(() => {
        const ink = pageInk(artwork.xml, text, ornament).replace(/<svg\b[^>]*>/, (root) =>
          root.replace(/\s(?:width|height)="[^"]*"/g, '').replace('<svg ', `<svg width="${artwork.width * 4}" height="${artwork.height * 4}" `));
        return svgImageUri(ink);
      });
      const image = await decode(uri, artwork);
      // Rendering never waits for disk; unsupported/full caches are harmless.
      void write?.(image, key).catch(() => {});
      return image;
    });
  };
  return { peek, load };
}
