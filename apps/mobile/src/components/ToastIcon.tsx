import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import type { ToastTone } from '@/features/toast/toastStore';
import { radius } from '@/theme';
import { useReduceMotion } from './useReduceMotion';

const SIZE = 36;
const useNativeDriver = Platform.OS !== 'web';


/**
 * The toast's icon, animated to match what the toast means:
 * loading spins, success pops with a ripple, warning keeps pulsing (still waiting),
 * error shakes once, info pops in.
 */
export function ToastIcon({
  tone,
  icon,
  color,
  background,
}: {
  tone: ToastTone;
  icon: IconName;
  color: string;
  background: string;
}) {
  const reduceMotion = useReduceMotion();
  const [pop] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion || tone === 'loading') {
      pop.setValue(1);
      ring.setValue(0);
      shake.setValue(0);
      return;
    }

    // Starts just after the card lands, so the two motions read as one.
    const popIn = Animated.sequence([
      Animated.delay(90),
      Animated.spring(pop, {
        toValue: 1,
        // A looser spring gives success a happy little bounce.
        damping: tone === 'success' ? 7 : 12,
        stiffness: 260,
        useNativeDriver,
      }),
    ]);

    const ripple = (duration: number) =>
      Animated.timing(ring, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      });

    let animation: Animated.CompositeAnimation;
    switch (tone) {
      case 'success':
        animation = Animated.parallel([
          popIn,
          Animated.sequence([Animated.delay(160), ripple(650)]),
        ]);
        break;
      case 'warning':
        animation = Animated.parallel([
          popIn,
          Animated.loop(
            Animated.sequence([
              ripple(1300),
              Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver }),
              Animated.delay(250),
            ]),
          ),
        ]);
        break;
      case 'error': {
        const nudge = (toValue: number) =>
          Animated.timing(shake, { toValue, duration: 55, useNativeDriver });
        animation = Animated.sequence([
          popIn,
          nudge(1),
          nudge(-1),
          nudge(1),
          nudge(-1),
          nudge(0),
        ]);
        break;
      }
      default:
        animation = popIn;
    }

    animation.start();
    return () => animation.stop();
  }, [pop, reduceMotion, ring, shake, tone]);

  const iconStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
      { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
    ],
  };
  const ringStyle = {
    borderColor: color,
    // Hidden at rest, strongest as it starts, gone as it reaches full size.
    opacity: ring.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.55, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
  };

  return (
    <View style={styles.frame}>
      <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
      <Animated.View style={[styles.circle, { backgroundColor: background }, iconStyle]}>
        {tone === 'loading' ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Icon name={icon} size={20} color={color} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: SIZE,
    height: SIZE,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
