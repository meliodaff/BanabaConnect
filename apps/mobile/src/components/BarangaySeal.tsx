import { Image } from 'react-native';
import { radius } from '@/theme';

// The official seal of Barangay Banaba (same file as the Command Dashboard's apps/web/public/brand).
const SEAL = require('../../assets/barangay-banaba-seal.jpg');

/** The Barangay Banaba seal, cropped to a circle (the image file has black corners). */
export function BarangaySeal({ size }: { size: number }) {
  return (
    <Image
      source={SEAL}
      style={{ width: size, height: size, borderRadius: radius.pill }}
      accessibilityLabel="Seal of Barangay Banaba, San Mateo, Rizal"
    />
  );
}
