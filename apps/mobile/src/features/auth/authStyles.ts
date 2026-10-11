import { StyleSheet } from 'react-native';
import { radius, type ThemeColors } from '@/theme';

/** Layout shared by the sign-in, register, details and ID screens. Use with useThemedStyles. */
export function createAuthStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 16,
    },
    step: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.selected,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    titleAfterStep: {
      marginTop: -12,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      marginTop: -8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      gap: 16,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.emergencySoft,
      borderRadius: radius.md,
      padding: 12,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 15,
      color: colors.emergencyText,
      fontWeight: '600',
    },
    infoBanner: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.selectedSoft,
      borderRadius: radius.lg,
      padding: 16,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    infoText: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
      marginTop: 4,
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
      minHeight: 44,
    },
    linkPrompt: {
      fontSize: 15,
      color: colors.textMuted,
    },
    link: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.selected,
    },
    textButton: {
      alignSelf: 'center',
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    fieldLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 11,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    chipSelected: {
      backgroundColor: colors.selected,
      borderColor: colors.selected,
    },
    chipText: {
      fontSize: 15,
      color: colors.text,
    },
    chipTextSelected: {
      color: colors.onSelected,
      fontWeight: '700',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
