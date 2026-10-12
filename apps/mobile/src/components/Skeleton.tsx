import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radius as radii, useTheme } from '@/theme';
import { useReduceMotion } from './useReduceMotion';

const useNativeDriver = Platform.OS !== 'web';
/** Local loads usually finish before this, so fast screens never flash a skeleton. */
const SHOW_AFTER_MS = 120;
const PULSE_MS = 1000;
const DIM_OPACITY = 0.45;

/** The group's shared pulse, so every block in it breathes together. */
const PulseContext = createContext<Animated.Value | null>(null);

/**
 * Stands in for content that is still loading, shaped like the real layout so nothing jumps when
 * it arrives. The cards around the blocks stay still; only the gray blocks pulse, all in step.
 * Screen readers hear a single "Loading".
 */
export function SkeletonGroup({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const [visible] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const appear = Animated.sequence([
      Animated.delay(SHOW_AFTER_MS),
      Animated.timing(visible, { toValue: 1, duration: reduceMotion ? 0 : 150, useNativeDriver }),
    ]);
    const fade = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: PULSE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver,
      });
    pulse.setValue(1);
    const animation = reduceMotion
      ? appear
      : Animated.parallel([appear, Animated.loop(Animated.sequence([fade(DIM_OPACITY), fade(1)]))]);
    animation.start();
    return () => animation.stop();
  }, [visible, pulse, reduceMotion]);

  return (
    <PulseContext.Provider value={pulse}>
      <Animated.View
        style={[style, { opacity: visible }]}
        accessible
        accessibilityLabel="Loading"
        accessibilityState={{ busy: true }}
      >
        {children}
      </Animated.View>
    </PulseContext.Provider>
  );
}

/** One gray placeholder shape. Put it inside a SkeletonGroup. */
export function SkeletonBlock({
  width,
  height,
  radius = radii.sm,
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pulse = useContext(PulseContext);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border, opacity: pulse ?? 1 },
        style,
      ]}
    />
  );
}
