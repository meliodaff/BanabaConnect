import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface ReportPhoto {
  uri: string;
  width: number;
  height: number;
}

export type PhotoSource = 'camera' | 'library';

// Keeps photos around 200–400 KB so they can upload on a weak signal.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.6;

export class PhotoPermissionError extends Error {}

/** Lets the resident take or choose a photo, then resizes and compresses it. Returns null if cancelled. */
export async function pickReportPhoto(source: PhotoSource): Promise<ReportPhoto | null> {
  let result: ImagePicker.ImagePickerResult;

  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      throw new PhotoPermissionError('Camera permission was not granted.');
    }
    result = await ImagePicker.launchCameraAsync({ quality: 1 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  }

  if (result.canceled) {
    return null;
  }

  return compressPhoto(result.assets[0]);
}

async function compressPhoto(asset: ImagePicker.ImagePickerAsset): Promise<ReportPhoto> {
  const context = ImageManipulator.manipulate(asset.uri);

  if (Math.max(asset.width, asset.height) > MAX_DIMENSION) {
    context.resize(
      asset.width >= asset.height
        ? { width: MAX_DIMENSION, height: null }
        : { width: null, height: MAX_DIMENSION },
    );
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
