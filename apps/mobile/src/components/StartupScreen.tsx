import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useReduceMotion } from '@/components/useReduceMotion';

// Long enough to read the seal and name, short enough not to delay someone reporting an emergency.
const SPLASH_DURATION_MS = 700;
const REVEAL_DURATION_MS = 400;

/** Keep navigation mounted so the app can initialize behind the startup screen. */
export function StartupScreen({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !visible) return;

    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 0 : REVEAL_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => animation.stop();
  }, [ready, reduceMotion, reveal, visible]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: reveal,
            transform: [{
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [reduceMotion ? 0 : 18, 0],
              }),
            }],
          },
        ]}
        pointerEvents={visible ? 'none' : 'auto'}
        accessibilityElementsHidden={visible}
        importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </Animated.View>
      {visible && (
        <Animated.View
          style={[
            styles.splash,
            { opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
          onLayout={() => SplashScreen.hide()}
          accessibilityViewIsModal
        >
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Seal of Barangay Banaba, San Mateo, Rizal"
          />
          <Text style={styles.title}>BanabaConnect</Text>
          <Text style={styles.subtitle}>Your barangay, within reach.</Text>
          <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Loading BanabaConnect">
            <LoadingDots reduceMotion={reduceMotion} />
            <Text style={styles.loadingText}>Opening BanabaConnect…</Text>
          </View>
          <Text style={styles.location}>Barangay Banaba · San Mateo, Rizal</Text>
          <StatusBar style="dark" />
        </Animated.View>
      )}
    </View>
  );
}

function LoadingDots({ reduceMotion }: { reduceMotion: boolean }) {
  const [wave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;

    wave.setValue(0);
    const animation = Animated.loop(Animated.timing(wave, {
      toValue: 1,
      duration: 1400,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, wave]);

  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((index) => {
        const inputRange = [0, 0.12 + index * 0.12, 0.32 + index * 0.12, 0.52 + index * 0.12, 1];
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              !reduceMotion && {
                opacity: wave.interpolate({ inputRange, outputRange: [0.35, 0.35, 1, 0.35, 0.35] }),
                transform: [
                  { translateY: wave.interpolate({ inputRange, outputRange: [0, 0, -4, 0, 0] }) },
                  { scale: wave.interpolate({ inputRange, outputRange: [0.8, 0.8, 1.2, 0.8, 0.8] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    zIndex: 1000,
    elevation: 1000,
  },
  logo: {
    width: 200,
    height: 200,
    maxWidth: '70%',
  },
  title: {
    marginTop: 24,
    color: '#1E232B',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#555C68',
    fontSize: 15,
    textAlign: 'center',
  },
  loading: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    maxWidth: '100%',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A5F8F',
  },
  loadingText: {
    flexShrink: 1,
    color: '#3A5F8F',
    fontSize: 14,
    fontWeight: '500',
  },
  location: {
    marginTop: 32,
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});
