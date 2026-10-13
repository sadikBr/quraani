import * as ImagePicker from 'expo-image-picker';
import * as Manipulator from 'expo-image-manipulator';
import type { PhotoBody } from './api';

/** Profile photos are squares this many pixels wide (a few tens of KB as JPEG). */
export const PHOTO_SIZE = 512;

/**
 * Picks a photo from the phone's gallery, cropped square by the user, and makes it a small JPEG
 * ready to upload. Null when the user backs out.
 */
export async function pickPhoto(): Promise<{ body: PhotoBody; preview: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (result.canceled || !result.assets?.length) return null;
  const { uri, width, height } = result.assets[0];
  const context = Manipulator.ImageManipulator.manipulate(uri);
  const side = Math.min(width, height);
  // Square already when cropped; centred otherwise (a size of 0 means it wasn't known).
  if (side > 0 && width !== height) context.crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side });
  context.resize(side > 0 ? { width: PHOTO_SIZE, height: PHOTO_SIZE } : { width: PHOTO_SIZE, height: null });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: Manipulator.SaveFormat.JPEG, compress: 0.82 });
  // React Native sends a file in a form by its uri, name and type.
  return { body: { uri: saved.uri, name: 'photo.jpg', type: 'image/jpeg' }, preview: saved.uri };
}
