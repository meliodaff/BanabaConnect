import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { icons, type IconName } from '@/components/Icon';
import { ToastIcon } from '@/components/ToastIcon';
import {
  hideToast,
  useCurrentToast,
  type Toast,
  type ToastTone,
} from '@/features/toast/toastStore';
import { cardShadow, radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

const VISIBLE_MS = 3500;
/** Longer when there is an action, so there is time to reach it. */
const VISIBLE_WITH_ACTION_MS = 5500;
/** A safety limit; a loading toast is normally replaced by its result well before this. */
const LOADING_MAX_MS = 30_000;
/** How far up a swipe has to go to dismiss. */
const SWIPE_DISMISS_PX = 24;
const useNativeDriver = Platform.OS !== 'web';

const DEFAULT_ICONS: Record<ToastTone, IconName> = {
  info: icons.info,
  success: icons.check,
  warning: icons.queued,
  error: icons.alert,
  loading: icons.sending,
};

function toneColors(tone: ToastTone, colors: ThemeColors) {
  switch (tone) {
    case 'success':
      return { color: colors.success, background: colors.successSoft };
    case 'warning':
      return { color: colors.warning, background: colors.warningSoft };
    case 'error':
      return { color: colors.emergencyText, background: colors.emergencySoft };
    default:
      return { color: colors.primary, background: colors.primarySoft };
  }
}

/** Shows the current toast above every screen. Mount once, in the root layout. */
export function ToastHost() {
  const toast = useCurrentToast();
  const insets = useSafeAreaInsets();

  return (
    <View style={[hostStyles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      {/* Keyed by id so a replacing toast animates in fresh. */}
      {toast && <ToastCard key={toast.id} toast={toast} />}
    </View>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = toast.tone ?? 'info';
  const tone = toneColors(kind, colors);
  const visibleMs =
    toast.duration ??
    (kind === 'loading' ? LOADING_MAX_MS : toast.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS);

  // 0 = hidden, 1 = shown. `drag` follows the finger while swiping.
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));

  // Safe to call more than once: it restarts the same fade, and hideToast ignores old ids.
  const dismiss = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver,
    }).start(() => hideToast(toast.id));
  }, [progress, toast.id]);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver,
    }).start();
    AccessibilityInfo.announceForAccessibility(toast.message);
    const timer = setTimeout(dismiss, visibleMs);
    return () => clearTimeout(timer);
  }, [dismiss, progress, toast.message, visibleMs]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          // Moves freely upward; resists being pulled down.
          drag.setValue(gesture.dy < 0 ? gesture.dy : gesture.dy * 0.2);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -SWIPE_DISMISS_PX || gesture.vy < -0.5) {
            dismiss();
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: 0, useNativeDriver }).start();
        },
      }),
    [dismiss, drag],
  );

  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
    drag,
  );
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Animated.View
      style={[styles.card, { opacity: progress, transform: [{ translateY }, { scale }] }]}
      accessibilityLiveRegion="polite"
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={dismiss}
        style={styles.body}
        accessibilityRole="button"
        accessibilityLabel={toast.message}
        accessibilityHint="Closes this message"
      >
        <ToastIcon
          tone={kind}
          icon={toast.icon ?? DEFAULT_ICONS[kind]}
          color={tone.color}
          background={tone.background}
        />
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
      {toast.action && (
        <Pressable
          onPress={() => {
            toast.action?.onPress();
            dismiss();
          }}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const hostStyles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 480,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 8,
      minHeight: 56,
      ...cardShadow(colors),
      shadowOpacity: 0.16,
      elevation: 8,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
    },
    message: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.text,
    },
    action: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: radius.md,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary,
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
