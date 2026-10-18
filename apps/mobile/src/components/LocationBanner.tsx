import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, icons, type IconName } from '@/components/Icon';
import type { LocationState } from '@/features/report/useReportLocation';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/** Where the report's location stands, with the one action that fixes it (allow, turn on, retry). */
export function LocationBanner({ location, onRetry }: { location: LocationState; onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  let icon: IconName;
  let title: string;
  let detail: string;
  let tone: { color: string; background: string };
  let action: string | null = null;

  switch (location.status) {
    case 'ready':
      icon = icons.check;
      title = 'Location found';
      detail = formatAccuracy(location.coords.accuracy) ?? 'Responders will see where you are.';
      tone = { color: colors.success, background: colors.successSoft };
      break;
    case 'approximate':
      icon = icons.location;
      title = 'Using your last known location';
      detail = 'We could not get a fresh GPS fix. Step outside or near a window, then try again.';
      tone = { color: colors.warning, background: colors.warningSoft };
      action = 'Try again';
      break;
    case 'locating':
      icon = icons.locating;
      title = 'Finding your location…';
      detail = location.coords
        ? 'Almost there, improving accuracy.'
        : 'This can take a few seconds. Keep this screen open.';
      tone = { color: colors.warning, background: colors.warningSoft };
      break;
    case 'denied':
      icon = icons.locationOff;
      title = 'Location permission needed';
      detail = location.canAskAgain
        ? 'The barangay needs your location to send help.'
        : 'Open Settings, tap Permissions, then Location, and choose "Allow". Then come back here.';
      tone = { color: colors.emergencyText, background: colors.emergencySoft };
      action = location.canAskAgain ? 'Allow' : 'Open settings';
      break;
    case 'servicesOff':
      icon = icons.locationOff;
      title = "Your phone's location is off";
      detail = 'Turn on Location so the barangay can find you.';
      tone = { color: colors.emergencyText, background: colors.emergencySoft };
      action = Platform.OS === 'android' ? 'Turn on' : 'Open settings';
      break;
    case 'error':
      icon = icons.locationOff;
      title = 'Could not find your location';
      detail = 'Step outside or near a window, then try again.';
      tone = { color: colors.emergencyText, background: colors.emergencySoft };
      action = 'Try again';
      break;
  }

  return (
    <View
      style={[styles.banner, { backgroundColor: tone.background }]}
      accessibilityLiveRegion="polite"
    >
      {location.status === 'locating' ? (
        <ActivityIndicator color={tone.color} />
      ) : (
        <Icon name={icon} size={24} color={tone.color} />
      )}
      <View style={styles.flex}>
        <Text style={[styles.bannerTitle, { color: tone.color }]}>{title}</Text>
        <Text style={styles.bannerDetail}>{detail}</Text>
      </View>
      {action && (
        <Pressable onPress={onRetry} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function formatAccuracy(accuracy: number | null) {
  return accuracy === null ? null : `Accurate to about ${Math.round(accuracy)} meters.`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: radius.lg,
      padding: 14,
    },
    bannerTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    bannerDetail: {
      fontSize: 14,
      color: colors.text,
      marginTop: 2,
    },
    link: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.selected,
    },
    flex: {
      flex: 1,
    },
  });
}
