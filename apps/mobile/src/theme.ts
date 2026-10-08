// Every color in the app comes from here, so the palette can change in one place.
// The palette follows the banaba tree (Lagerstroemia speciosa) that Barangay Banaba is
// named after: mauve-purple petals, dark green leaves, yellow stamens, cream and bark tones.
// Emergency red is not from the tree; it stays so emergencies stand out.
export const colors = {
  /** Banaba petal purple. */
  primary: '#6A3A8E',
  primaryDark: '#52296F',
  primarySoft: '#F3ECF8',
  onPrimary: '#FFFFFF',
  /** Banaba leaf green, used for the "Connect" in the wordmark. */
  brandAccent: '#2F6B3F',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  border: '#E9E2DA',
  text: '#2A2230',
  textMuted: '#6E6474',
  emergency: '#C62E2E',
  emergencySoft: '#FBEAE8',
  onEmergency: '#FFFFFF',
  selected: '#6A3A8E',
  selectedSoft: '#F3ECF8',
  onSelected: '#FFFFFF',
  /** Leaf green. */
  success: '#2F6B3F',
  successSoft: '#E7F1E8',
  successBorder: '#C4DCC8',
  /** Stamen gold, darkened for readable text. */
  warning: '#946200',
  warningSoft: '#FBF4DC',
  warningBorder: '#EADBA6',
  disabled: '#B3ABB5',
  /** Report category icons share one color; the icon and label tell them apart. */
  categoryIcon: '#6A3A8E',
  categoryTint: '#F3ECF8',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};
