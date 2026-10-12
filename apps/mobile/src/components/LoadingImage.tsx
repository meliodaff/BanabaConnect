import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { useReduceMotion } from './useReduceMotion';

const useNativeDriver = Platform.OS !== 'web';
/** Photos on the phone usually open faster than this, so they never flash a spinner. */
const SHOW_AFTER_MS = 150;

/**
 * A photo that shows a spinner while it loads, and `fallback` if it can't be opened.
 * `style` sizes the box (e.g. width, height or aspectRatio, borderRadius); the image fills it.
 */
export function LoadingImage({
  uri,
  style,
  accessibilityLabel,
  fallback = null,
}: {
  uri: string;
  style: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  fallback?: ReactNode;
}) {
  const { colors } = useTheme();
  const [result, setResult] = useState<{ uri: string; failed: boolean } | null>(null);
  const loading = result?.uri !== uri;

  if (result && !loading && result.failed && fallback) {
    return fallback;
  }

  return (
    <View style={[styles.box, { backgroundColor: colors.background }, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        onLoad={() => setResult({ uri, failed: false })}
        onError={() => setResult({ uri, failed: true })}
        accessibilityLabel={accessibilityLabel}
      />
      {loading && <Spinner />}
    </View>
  );
}

/** A spinner centered in its parent, fading in only if the wait lasts. */
export function Spinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(SHOW_AFTER_MS),
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : 150, useNativeDriver }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View style={[styles.spinner, { opacity }]} pointerEvents="none">
      <ActivityIndicator size={size} color={colors.primary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  spinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
