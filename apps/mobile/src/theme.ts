import { useColorScheme } from 'react-native';
import { useThemePreference } from '@/features/appearance/themePreference';

// Every color in the app comes from here, so the palette can change in one place.
// Each palette has a light and a dark version with the same token names, and every text pair
// is at least 4.5:1 contrast. Red, green, and amber carry meaning (emergency, sent, waiting
// for signal), so they stay the same across palettes.

/** Plain grays, used while the final brand colors are decided. */
const neutralLight = {
  primary: '#374151',
  primarySoft: '#ECEDEF',
  onPrimary: '#FFFFFF',
  /** The "Connect" in the wordmark. */
  brandAccent: '#6B7280',
  background: '#F7F7F8',
  surface: '#FFFFFF',
  border: '#E4E4E7',
  text: '#18181B',
  textMuted: '#52525B',
  /** Fill for report and 911 buttons. Stays the same red in both modes. */
  emergency: '#D32F2F',
  /** Red for text and icons sitting on a surface or a soft tint. */
  emergencyText: '#C62828',
  emergencySoft: '#FDE7E7',
  onEmergency: '#FFFFFF',
  selected: '#374151',
  selectedSoft: '#ECEDEF',
  onSelected: '#FFFFFF',
  success: '#27722B',
  successSoft: '#E3F4E4',
  successBorder: '#B9DFBC',
  warning: '#A34A06',
  warningSoft: '#FFEDD5',
  warningBorder: '#F8CF9F',
  /** Decoration only (icon circles, accents); never a status and never text. */
  highlight: '#A1A1AA',
  highlightSoft: '#F1F1F3',
  disabled: '#A1A1AA',
  /** Report category icons share one color; the icon and label tell them apart. */
  categoryIcon: '#374151',
  categoryTint: '#ECEDEF',
  shadow: '#18181B',
};

export type ThemeColors = typeof neutralLight;

const neutralDark: ThemeColors = {
  primary: '#D4D4D8',
  primarySoft: '#2E2E33',
  onPrimary: '#18181B',
  brandAccent: '#A1A1AA',
  background: '#121214',
  surface: '#1C1C1F',
  border: '#2E2E33',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  emergency: '#D32F2F',
  emergencyText: '#FF8A80',
  emergencySoft: '#3D1C1C',
  onEmergency: '#FFFFFF',
  selected: '#D4D4D8',
  selectedSoft: '#2E2E33',
  onSelected: '#18181B',
  success: '#81C784',
  successSoft: '#1A2E1C',
  successBorder: '#34573A',
  warning: '#FFB74D',
  warningSoft: '#3A2810',
  warningBorder: '#6B4419',
  highlight: '#71717A',
  highlightSoft: '#26262A',
  disabled: '#52525B',
  categoryIcon: '#D4D4D8',
  categoryTint: '#2E2E33',
  shadow: '#000000',
};

// The banaba flower look: bright pink-magenta flowers, sunny yellow stamens, green leaves.
const banabaPinkLight: ThemeColors = {
  /** Banaba flower magenta. */
  primary: '#C2185B',
  primarySoft: '#FDE3EE',
  onPrimary: '#FFFFFF',
  /** Banaba leaf green, used for the "Connect" in the wordmark. */
  brandAccent: '#27722B',
  background: '#FFF8F4',
  surface: '#FFFFFF',
  border: '#F3DFE4',
  text: '#2A1520',
  textMuted: '#6E5562',
  /** Fill for report and 911 buttons. Stays the same red in both modes. */
  emergency: '#D32F2F',
  /** Red for text and icons sitting on a surface or a soft tint. */
  emergencyText: '#C62828',
  emergencySoft: '#FDE7E7',
  onEmergency: '#FFFFFF',
  selected: '#C2185B',
  selectedSoft: '#FDE3EE',
  onSelected: '#FFFFFF',
  /** Leaf green. */
  success: '#27722B',
  successSoft: '#E3F4E4',
  successBorder: '#B9DFBC',
  /** Deep amber, kept apart from the gold highlight so "waiting for signal" stays clear. */
  warning: '#A34A06',
  warningSoft: '#FFEDD5',
  warningBorder: '#F8CF9F',
  /** Stamen gold. Decoration only (icon circles, accents); never a status and never text. */
  highlight: '#F5B700',
  highlightSoft: '#FFF4CC',
  disabled: '#B9A9B1',
  /** Report category icons share one color; the icon and label tell them apart. */
  categoryIcon: '#C2185B',
  categoryTint: '#FDE3EE',
  shadow: '#5A1838',
};

const banabaPinkDark: ThemeColors = {
  primary: '#FF7AB0',
  primarySoft: '#4A1D33',
  onPrimary: '#1A1216',
  brandAccent: '#81C784',
  background: '#1A1216',
  surface: '#26191F',
  border: '#43293A',
  text: '#FBEFF4',
  textMuted: '#C9AEBB',
  emergency: '#D32F2F',
  emergencyText: '#FF8A80',
  emergencySoft: '#4A1C1C',
  onEmergency: '#FFFFFF',
  selected: '#FF7AB0',
  selectedSoft: '#4A1D33',
  onSelected: '#1A1216',
  success: '#81C784',
  successSoft: '#1D3320',
  successBorder: '#34573A',
  warning: '#FFB74D',
  warningSoft: '#43290F',
  warningBorder: '#6B4419',
  highlight: '#FFC94D',
  highlightSoft: '#45370F',
  disabled: '#5F4C55',
  categoryIcon: '#FF7AB0',
  categoryTint: '#4A1D33',
  shadow: '#000000',
};

const PALETTES = {
  neutral: { light: neutralLight, dark: neutralDark },
  banabaPink: { light: banabaPinkLight, dark: banabaPinkDark },
} satisfies Record<string, { light: ThemeColors; dark: ThemeColors }>;

/** The palette in use. Set to 'banabaPink' to bring back the pink look. */
const ACTIVE_PALETTE: keyof typeof PALETTES = 'neutral';

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export function cardShadow(colors: ThemeColors) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  };
}

export type ColorScheme = 'light' | 'dark';

/** The active colors: the resident's choice in Profile, or the phone's setting. */
export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const preference = useThemePreference();
  const phoneScheme = useColorScheme();
  const scheme: ColorScheme =
    preference === 'system' ? (phoneScheme === 'dark' ? 'dark' : 'light') : preference;
  return { scheme, colors: PALETTES[ACTIVE_PALETTE][scheme] };
}

const styleCache = new WeakMap<object, WeakMap<ThemeColors, unknown>>();

/**
 * Builds a screen's styles for the active colors. Each factory runs once per mode,
 * so list rows and other repeated components share the same style objects.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  let byColors = styleCache.get(factory);
  if (!byColors) {
    byColors = new WeakMap();
    styleCache.set(factory, byColors);
  }
  if (!byColors.has(colors)) {
    byColors.set(colors, factory(colors));
  }
  return byColors.get(colors) as T;
}
