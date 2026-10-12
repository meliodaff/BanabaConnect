import type { ImageSourcePropType } from 'react-native';

export interface HotlineLogo {
  source: ImageSourcePropType;
  /** Crop to a circle, for round seals saved on a square background. */
  round?: boolean;
}

export interface Hotline {
  name: string;
  description: string;
  /** Digits to dial. `null` until the real number is confirmed. */
  number: string | null;
  /** The agency's official seal. Without one, the row shows a phone icon. */
  logo?: HotlineLogo;
  /**
   * Short text shown in a red emergency circle instead of a logo, for numbers with no official
   * logo file we can verify (e.g. 911). Not a logo; just the number.
   */
  badge?: string;
}

// Seals are Philippine government works (public domain under RA 8293, sec. 176). PNP and BFP come
// from Wikimedia Commons; the barangay seal is the same file the Command Dashboard uses.
// TODO: add the San Mateo MDRRMO (or municipal) seal, and swap the 911 badge for the official
// Emergency 911 National Office logo, once we have the files from an official source.
const SEALS = {
  barangay: { source: require('../../../assets/barangay-banaba-seal.jpg'), round: true },
  bfp: { source: require('../../../assets/agencies/bfp-seal.png') },
  pnp: { source: require('../../../assets/agencies/pnp-seal.png') },
} satisfies Record<string, HotlineLogo>;

// Only confirmed numbers go here: a wrong emergency number is worse than none.
// TODO: get the official numbers from Barangay Banaba and the San Mateo LGU.
export const HOTLINES: Hotline[] = [
  {
    name: 'National Emergency Hotline',
    description: 'Police, fire, and medical emergencies nationwide',
    number: '911',
    badge: '911',
  },
  {
    name: 'Barangay Banaba Hall',
    description: 'Barangay officials and tanod',
    number: null,
    logo: SEALS.barangay,
  },
  {
    name: 'San Mateo MDRRMO',
    description: 'Disaster response and rescue',
    number: null,
  },
  {
    name: 'BFP San Mateo',
    description: 'Fire station',
    number: null,
    logo: SEALS.bfp,
  },
  {
    name: 'PNP San Mateo',
    description: 'Police station',
    number: null,
    logo: SEALS.pnp,
  },
];
