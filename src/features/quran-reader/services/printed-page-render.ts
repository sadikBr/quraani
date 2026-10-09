import { Image, type ImageRef, type ImageSource } from 'expo-image';
import { Platform } from 'react-native';
import { createPrintedImageCache } from './printed-image-cache';
import { preparePageWhenIdle } from './page-preparation';

export type PrintedImage = ImageRef | ImageSource;
const native = Platform.OS !== 'web';
const images = createPrintedImageCache<PrintedImage>({
  sizeOf: (image) => 'nativeRefType' in image
    ? image.width * image.height * image.scale * image.scale * 4
    : (image.uri?.length ?? 0) * 2,
  prepare: preparePageWhenIdle,
  read: native ? (key) => Image.readFromCacheAsync(key) : undefined,
  write: native ? (image, key) => Image.writeToCacheAsync(image as ImageRef, key) : undefined,
  async decode(uri, artwork) {
    if (!native) {
      if (!await Image.prefetch(uri, { cachePolicy: 'memory' })) throw new Error('Could not prepare mushaf image');
      return { uri, width: artwork.width * 4, height: artwork.height * 4 };
    }
    // A ready ImageRef can be displayed directly on subsequent page turns.
    // The platform disk cache saves the rendered image for the next app launch.
    return Image.loadAsync({ uri }, { maxWidth: Math.ceil(artwork.width * 4), maxHeight: Math.ceil(artwork.height * 4) });
  },
});
export const getCachedPrintedImage = images.peek;
export const loadPrintedImage = images.load;
export const preloadPrintedImage = images.load;
