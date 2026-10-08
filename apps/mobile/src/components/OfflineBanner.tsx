import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { useIsOffline } from '@/features/network/useIsOffline';
import { OFFLINE_DEFAULT_MESSAGE } from '@/features/report/messages';
import { colors, radius } from '@/theme';

const BACK_ONLINE_VISIBLE_MS = 3000;


/**
 * Shows "You're offline" while there is no internet, then "Back online" for a few
 * seconds once the connection returns. Renders nothing the rest of the time.
 */
export function OfflineBanner({
  title = "You're offline",
  message = OFFLINE_DEFAULT_MESSAGE,
  style,
}: {
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const offline = useIsOffline();
  const [wasOffline, setWasOffline] = useState(offline);
  const [showBackOnline, setShowBackOnline] = useState(false);

  // Detect the offline -> online change during render (no extra effect pass needed).
  if (offline !== wasOffline) {
    setWasOffline(offline);
    setShowBackOnline(!offline);
  }

  useEffect(() => {
    if (!showBackOnline) {
      return;
    }
    const timer = setTimeout(() => setShowBackOnline(false), BACK_ONLINE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [showBackOnline]);

  if (offline) {
    return (
      <View
        style={[styles.banner, styles.offline, style]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Icon name={icons.offline} size={22} color={colors.warning} />
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.warning }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    );
  }

  if (showBackOnline) {
    return (
      <View style={[styles.banner, styles.online, style]} accessibilityLiveRegion="polite">
        <Icon name={icons.online} size={22} color={colors.success} />
        <Text style={[styles.title, { color: colors.success }]}>Back online</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  offline: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  online: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: 2,
  },
});
