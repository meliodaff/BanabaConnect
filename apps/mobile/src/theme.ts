import { useColorScheme } from 'react-native';
import { useThemePreference } from '@/features/appearance/themePreference';

// Shared interface colors live here; incident category colors live in categoryAppearance.ts.
// Each palette has a light and a dark version with the same token names, and every text pair
// is at least 4.5:1 contrast. Red, green, and amber carry meaning (emergency, sent, waiting
// for signal), so every palette keeps them red, green, and amber, and never uses them for branding.

/** Plain grays, used while the final brand colors are decided. */
const neutralLight = {
  primary: '#374151',
  primarySoft: '#ECEDEF',
  onPrimary: '#FFFFFF',
  /** The "Connect" in the wordmark. */
  brandAccent: '#6B7280',
  /** Top bar and screen headers. Palettes without a colored bar use the surface color. */
  headerBg: '#FFFFFF',
  /** Titles, icons and back arrows on the header. */
  headerText: '#18181B',
  /** The "Connect" in the wordmark when it sits on the header. */
  headerAccent: '#6B7280',
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
  /** Text and icons on a solid warning fill. */
  onWarning: '#FFFFFF',
  warningSoft: '#FFEDD5',
  warningBorder: '#F8CF9F',
  /** Violet for "In progress" reports: the barangay is working on it. Status pills only. */
  progress: '#6A4C9C',
  progressSoft: '#ECE6F5',
  progressBorder: '#CFC2E6',
  /** Decoration only (icon circles, accents); never a status and never text. */
  highlight: '#A1A1AA',
  highlightSoft: '#F1F1F3',
  disabled: '#A1A1AA',
  /** Neutral fallback for category placeholders; report symbols use their category palette. */
  categoryIcon: '#374151',
  categoryTint: '#ECEDEF',
  shadow: '#18181B',
  /** Dims the app behind the tutorial's spotlight. */
  scrim: 'rgba(15, 18, 24, 0.62)',
};

export type ThemeColors = typeof neutralLight;

const neutralDark: ThemeColors = {
  primary: '#D4D4D8',
  primarySoft: '#2E2E33',
  onPrimary: '#18181B',
  brandAccent: '#A1A1AA',
  headerBg: '#1C1C1F',
  headerText: '#F4F4F5',
  headerAccent: '#A1A1AA',
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
  onWarning: '#18181B',
  warningSoft: '#3A2810',
  warningBorder: '#6B4419',
  progress: '#C4B1EA',
  progressSoft: '#2D2540',
  progressBorder: '#4A3D66',
  highlight: '#71717A',
  highlightSoft: '#26262A',
  disabled: '#52525B',
  categoryIcon: '#D4D4D8',
  categoryTint: '#2E2E33',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.72)',
};

// The banaba flower look: bright pink-magenta flowers, sunny yellow stamens, green leaves.
const banabaPinkLight: ThemeColors = {
  /** Banaba flower magenta. */
  primary: '#C2185B',
  primarySoft: '#FDE3EE',
  onPrimary: '#FFFFFF',
  /** Banaba leaf green, used for the "Connect" in the wordmark. */
  brandAccent: '#27722B',
  headerBg: '#FFFFFF',
  headerText: '#2A1520',
  headerAccent: '#27722B',
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
  onWarning: '#FFFFFF',
  warningSoft: '#FFEDD5',
  warningBorder: '#F8CF9F',
  progress: '#6A4C9C',
  progressSoft: '#ECE6F5',
  progressBorder: '#CFC2E6',
  /** Stamen gold. Decoration only (icon circles, accents); never a status and never text. */
  highlight: '#F5B700',
  highlightSoft: '#FFF4CC',
  disabled: '#B9A9B1',
  /** Neutral fallback for category placeholders; report symbols use their category palette. */
  categoryIcon: '#C2185B',
  categoryTint: '#FDE3EE',
  shadow: '#5A1838',
  scrim: 'rgba(40, 10, 24, 0.62)',
};

const banabaPinkDark: ThemeColors = {
  primary: '#FF7AB0',
  primarySoft: '#4A1D33',
  onPrimary: '#1A1216',
  brandAccent: '#81C784',
  headerBg: '#26191F',
  headerText: '#FBEFF4',
  headerAccent: '#81C784',
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
  onWarning: '#1A1216',
  warningSoft: '#43290F',
  warningBorder: '#6B4419',
  progress: '#C4B1EA',
  progressSoft: '#2D2540',
  progressBorder: '#4A3D66',
  highlight: '#FFC94D',
  highlightSoft: '#45370F',
  disabled: '#5F4C55',
  categoryIcon: '#FF7AB0',
  categoryTint: '#4A1D33',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.72)',
};

// Denim: a faded denim blue with a filled blue header, soft gold accents and blue-gray surfaces.
// Easy on the eyes and official-looking; red stays the loudest color on every screen.
const denimLight: ThemeColors = {
  primary: '#3A5F8F',
  primarySoft: '#DFE6EE',
  onPrimary: '#FFFFFF',
  brandAccent: '#3A5F8F',
  headerBg: '#3A5F8F',
  headerText: '#FFFFFF',
  /** Soft gold. */
  headerAccent: '#F5DE9A',
  background: '#EBEDF0',
  surface: '#F8F9FA',
  border: '#D5DAE0',
  text: '#1E232B',
  textMuted: '#555C68',
  /** Fill for report and 911 buttons. Stays the same red in both modes. */
  emergency: '#C2342E',
  /** Red for text and icons sitting on a surface or a soft tint. */
  emergencyText: '#B02E28',
  emergencySoft: '#F8E3E1',
  onEmergency: '#FFFFFF',
  selected: '#3A5F8F',
  selectedSoft: '#DFE6EE',
  onSelected: '#FFFFFF',
  success: '#2F6B33',
  successSoft: '#E1EDE1',
  successBorder: '#B7D2B8',
  warning: '#9A4A12',
  onWarning: '#FFFFFF',
  warningSoft: '#F6E9DA',
  warningBorder: '#E6C9A6',
  progress: '#6A4C9C',
  progressSoft: '#ECE6F5',
  progressBorder: '#CFC2E6',
  /** Gold. Decoration only (icon circles, step markers); never a status and never text. */
  highlight: '#D9AE45',
  highlightSoft: '#F3E8C8',
  disabled: '#A9B0BA',
  /** Neutral fallback for category placeholders; report symbols use their category palette. */
  categoryIcon: '#3A5F8F',
  categoryTint: '#DFE6EE',
  shadow: '#1E232B',
  scrim: 'rgba(18, 22, 28, 0.62)',
};

const denimDark: ThemeColors = {
  primary: '#9BB6D8',
  /** A faint blue, so icon circles keep the brand color instead of turning gray. */
  primarySoft: '#253247',
  onPrimary: '#14161A',
  brandAccent: '#9BB6D8',
  headerBg: '#22344D',
  headerText: '#FFFFFF',
  headerAccent: '#D9BD62',
  background: '#14161A',
  surface: '#1C1F24',
  border: '#2D3138',
  text: '#E3E5E9',
  textMuted: '#9EA4AE',
  /** Same red as light mode, so the Report button stays 3:1 against the tab bar. */
  emergency: '#C2342E',
  emergencyText: '#EE9088',
  emergencySoft: '#3D2220',
  onEmergency: '#FFFFFF',
  selected: '#9BB6D8',
  selectedSoft: '#253247',
  onSelected: '#14161A',
  success: '#8DBF8F',
  successSoft: '#1E2E20',
  successBorder: '#3A5A3C',
  warning: '#E3AE62',
  onWarning: '#14161A',
  warningSoft: '#3A2A16',
  warningBorder: '#5C4022',
  progress: '#C4B1EA',
  progressSoft: '#2D2540',
  progressBorder: '#4A3D66',
  highlight: '#D6AE45',
  highlightSoft: '#3A3018',
  disabled: '#4A5059',
  categoryIcon: '#9BB6D8',
  categoryTint: '#253247',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.72)',
};

const PALETTES = {
  neutral: { light: neutralLight, dark: neutralDark },
  banabaPink: { light: banabaPinkLight, dark: banabaPinkDark },
  denim: { light: denimLight, dark: denimDark },
} satisfies Record<string, { light: ThemeColors; dark: ThemeColors }>;

/** The palette in use. 'neutral' and 'banabaPink' are kept to compare against. */
const ACTIVE_PALETTE: keyof typeof PALETTES = 'denim';

/** True when screen headers are filled with color, so the status bar needs light icons. */
export function hasColoredHeader(colors: ThemeColors) {
  return colors.headerBg !== colors.surface;
}

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
