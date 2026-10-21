import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, icons } from '@/components/Icon';
import { useReduceMotion } from '@/components/useReduceMotion';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { TAB_ROUTES, TAP_HINT, TUTORIAL_STEPS, type TutorialStep } from './steps';
import { endTutorial, findTarget, getScroller, goToStep, onTargetTap, useTutorialStep } from './tutorialStore';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Room around the target inside the spotlight. */
const PAD = 6;
/** Between the spotlight and the card. */
const GAP = 14;
const EDGE = 16;
/** How long to wait for a step's part of the screen before going on without it. */
const WAIT_MS = 4000;
const DURATION = 300;
const EASING = Easing.out(Easing.cubic);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function measure(view: View) {
  return new Promise<Rect>((resolve) =>
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })),
  );
}

function sameRect(a: Rect, b: Rect) {
  return (
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

/** Measures until the target stops moving, since screens slide in when they open. */
async function settle(view: View, cancelled: () => boolean) {
  let last = await measure(view);
  for (let tries = 0; tries < 12 && !cancelled(); tries++) {
    await delay(80);
    const next = await measure(view);
    if (sameRect(last, next)) return next;
    last = next;
  }
  return last;
}

function isTab(pathname: string) {
  return (TAB_ROUTES as readonly string[]).includes(pathname);
}

/**
 * The interactive tutorial, started from Profile: it dims the app, puts a spotlight on one real
 * button at a time with a short card, and moves between the tabs by itself. Shown above every
 * screen (see app/_layout.tsx); toasts still show on top of it.
 */
export function TutorialOverlay() {
  const step = useTutorialStep();
  return step === null ? null : <Tour step={step} />;
}

function Tour({ step }: { step: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const current = TUTORIAL_STEPS[step];
  const total = TUTORIAL_STEPS.length;

  /** 1 going forward, -1 going back: which way to skip a step whose part isn't there. */
  const direction = useRef(1);
  /** The step was reached by tapping the real button, which opens its screen by itself. */
  const viaTap = useRef(false);
  const [found, setFound] = useState<{ step: number; rect: Rect | null } | null>(null);

  const go = useCallback(
    (next: number, tapped = false) => {
      if (next >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
      }
      if (next < 0) return;
      direction.current = next >= step ? 1 : -1;
      viaTap.current = tapped;
      goToStep(next);
    },
    [step],
  );

  // Opens the step's screen, then waits for its target and brings it into view.
  useEffect(() => {
    if (pathname !== current.route) {
      // After a tap the app opens the screen itself, so only step in if it doesn't.
      const timer = setTimeout(
        () => {
          if (current.route === '/report') router.push('/report');
          else if (!isTab(pathname) && router.canDismiss()) router.dismissAll();
          else router.navigate(current.route);
        },
        viaTap.current ? 800 : 0,
      );
      return () => clearTimeout(timer);
    }
    const ids = current.target;
    if (!ids) return;

    let cancelled = false;
    const isCancelled = () => cancelled;
    (async () => {
      await new Promise((resolve) => InteractionManager.runAfterInteractions(() => resolve(null)));
      const deadline = Date.now() + WAIT_MS;
      let view = findTarget(ids);
      while (!view && !cancelled && Date.now() < deadline) {
        await delay(100);
        view = findTarget(ids);
      }
      if (cancelled) return;
      let rect = view ? await settle(view, isCancelled) : null;
      if (cancelled) return;
      // A target that renders nothing (a setting this phone doesn't have) counts as missing.
      if (!view || !rect || rect.height === 0) {
        if (current.optional) go(step + direction.current);
        else setFound({ step, rect: null });
        return;
      }
      const scroller = getScroller(current.route);
      const visibleTop = insets.top + 56;
      const visibleBottom = height - insets.bottom - 90;
      if (scroller && (rect.y < visibleTop || rect.y + rect.height > visibleBottom)) {
        scroller.scrollBy(rect.y - (insets.top + height * 0.16), !reduceMotion);
        await delay(reduceMotion ? 50 : 450);
        if (cancelled) return;
        rect = await settle(view, isCancelled);
        if (cancelled) return;
      }
      setFound({ step, rect });
    })();
    return () => {
      cancelled = true;
    };
  }, [step, pathname, current, go, insets.top, insets.bottom, height, reduceMotion]);

  const centered = !current.target && pathname === current.route;
  const showing = centered ? { step, rect: null } : found?.step === step ? found : null;
  const ready = showing !== null;
  const rect = showing?.rect ?? null;

  // On "tap this" steps, tapping the real button moves the tutorial on.
  useEffect(() => {
    if (!ready || current.advanceOn !== 'tap') return;
    return onTargetTap((id) => {
      if (current.target?.includes(id)) go(step + 1, true);
    });
  }, [ready, current, step, go]);

  // Android's back button goes to the previous step instead of leaving the screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) go(step - 1);
      else endTutorial();
      return true;
    });
    return () => subscription.remove();
  }, [step, go]);

  useEffect(() => {
    if (ready) {
      AccessibilityInfo.announceForAccessibility(`Step ${step + 1} of ${total}. ${current.title}`);
    }
  }, [ready, step, total, current.title]);

  // The spotlight: a hole in the dimmed screen that glides from target to target. With no
  // target it shrinks to nothing in the middle, which dims the whole screen.
  const [hole] = useState(() => ({
    x: new Animated.Value(width / 2),
    y: new Animated.Value(height / 2),
    w: new Animated.Value(0),
    h: new Animated.Value(0),
    ring: new Animated.Value(0),
    fade: new Animated.Value(0),
  }));
  const holeX = rect ? rect.x - PAD : width / 2;
  const holeY = rect ? rect.y - PAD : height / 2;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;
  useEffect(() => {
    if (!ready) return;
    const to = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, {
        toValue,
        duration: reduceMotion ? 0 : DURATION,
        easing: EASING,
        useNativeDriver: false,
      });
    const animation = Animated.parallel([
      to(hole.x, holeX),
      to(hole.y, holeY),
      to(hole.w, holeW),
      to(hole.h, holeH),
      to(hole.ring, holeW > 0 ? 1 : 0),
    ]);
    animation.start();
    return () => animation.stop();
  }, [ready, holeX, holeY, holeW, holeH, hole, reduceMotion]);

  useEffect(() => {
    Animated.timing(hole.fade, {
      toValue: 1,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: false,
    }).start();
  }, [hole, reduceMotion]);

  const border = Math.max(width, height);
  const tapThrough = ready && current.advanceOn === 'tap' && rect;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: hole.fade }]} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Animated.subtract(hole.x, border),
          top: Animated.subtract(hole.y, border),
          width: Animated.add(hole.w, border * 2),
          height: Animated.add(hole.h, border * 2),
          borderWidth: border,
          borderRadius: radius.lg + border,
          borderColor: colors.scrim,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: Animated.subtract(hole.x, 3),
            top: Animated.subtract(hole.y, 3),
            width: Animated.add(hole.w, 6),
            height: Animated.add(hole.h, 6),
            opacity: hole.ring,
          },
        ]}
      />

      {/* Nothing in the app can be tapped during the tutorial, except the button a step asks for. */}
      {tapThrough ? (
        <>
          <Blocker style={{ left: 0, right: 0, top: 0, height: holeY }} />
          <Blocker style={{ left: 0, right: 0, top: holeY + holeH, bottom: 0 }} />
          <Blocker style={{ left: 0, top: holeY, width: holeX, height: holeH }} />
          <Blocker style={{ left: holeX + holeW, right: 0, top: holeY, height: holeH }} />
        </>
      ) : (
        <Blocker style={StyleSheet.absoluteFill} />
      )}

      <Card
        step={step}
        ready={ready}
        rect={rect}
        onNext={() => go(step + 1)}
        onBack={() => go(step - 1)}
      />
    </Animated.View>
  );
}

function Blocker({ style }: { style: object }) {
  return (
    <View
      style={[{ position: 'absolute' }, style]}
      onStartShouldSetResponder={() => true}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

function Card({
  step,
  ready,
  rect,
  onNext,
  onBack,
}: {
  step: number;
  ready: boolean;
  rect: Rect | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const total = TUTORIAL_STEPS.length;

  // The card keeps showing the last step while the next screen opens, so it never blinks out.
  const [shown, setShown] = useState<{ step: number; rect: Rect | null } | null>(null);
  if (ready && (shown?.step !== step || shown.rect !== rect)) {
    setShown({ step, rect });
  }
  const [cardHeight, setCardHeight] = useState(0);
  const [motion] = useState(() => ({ top: new Animated.Value(0), opacity: new Animated.Value(0) }));
  const placed = useRef(false);

  // Below the spotlight if it fits, else above, else at the bottom of the screen.
  let top = (height - cardHeight) / 2;
  let side: 'below' | 'above' | 'none' = 'none';
  let arrowLeft = 0;
  const target = shown?.rect;
  if (target) {
    const holeTop = target.y - PAD;
    const holeBottom = target.y + target.height + PAD;
    if (holeBottom + GAP + cardHeight <= height - insets.bottom - EDGE) {
      top = holeBottom + GAP;
      side = 'below';
    } else if (holeTop - GAP - cardHeight >= insets.top + EDGE) {
      top = holeTop - GAP - cardHeight;
      side = 'above';
    } else {
      top = height - insets.bottom - EDGE - cardHeight;
    }
    const cardWidth = width - EDGE * 2;
    arrowLeft = Math.min(Math.max(target.x + target.width / 2 - EDGE, 28), cardWidth - 28) - 6;
  }

  useEffect(() => {
    if (!shown || cardHeight === 0) return;
    if (!placed.current) {
      placed.current = true;
      motion.top.setValue(top);
      Animated.timing(motion.opacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    const animation = Animated.timing(motion.top, {
      toValue: top,
      duration: reduceMotion ? 0 : DURATION,
      easing: EASING,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [shown, cardHeight, top, motion, reduceMotion]);

  if (!shown) return null;
  const words = TUTORIAL_STEPS[shown.step];
  const first = shown.step === 0;
  const last = shown.step === total - 1;

  return (
    <Animated.View
      style={[styles.card, { top: motion.top, opacity: motion.opacity }]}
      onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
      accessibilityViewIsModal
    >
      {side !== 'none' && (
        <View
          pointerEvents="none"
          style={[styles.arrow, side === 'below' ? styles.arrowUp : styles.arrowDown, { left: arrowLeft }]}
        />
      )}

      <View style={styles.header}>
        {first ? (
          <Text style={styles.eyebrow}>How to use the app</Text>
        ) : (
          <View
            style={styles.progress}
            accessible
            accessibilityLabel={`Step ${shown.step + 1} of ${total}`}
          >
            <Text style={styles.counter}>
              <Text style={styles.counterNow}>{shown.step + 1}</Text> / {total}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${((shown.step + 1) / total) * 100}%` }]} />
            </View>
          </View>
        )}
        <Pressable
          onPress={endTutorial}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="End tutorial"
        >
          <Icon name={icons.close} size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <StepWords key={shown.step} step={words} tapHint={words.advanceOn === 'tap' && !!shown.rect} />

      <View style={styles.footer}>
        {first ? (
          <Pressable
            onPress={endTutorial}
            style={({ pressed }) => [styles.quietButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.quietText}>Not now</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onBack}
            disabled={!ready}
            style={({ pressed }) => [styles.quietButton, styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
          >
            <Icon name={icons.back} size={18} color={colors.textMuted} />
            <Text style={styles.quietText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onNext}
          disabled={!ready}
          style={({ pressed }) => [
            styles.primaryButton,
            !ready && styles.busy,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
        >
          <Text style={styles.primaryText}>{first ? 'Start' : last ? 'Finish' : 'Next'}</Text>
          <Icon name={last ? icons.done : icons.chevron} size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** A step's words; remounted for each step, so they fade in. */
function StepWords({ step, tapHint }: { step: TutorialStep; tapHint: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduceMotion = useReduceMotion();
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: reduceMotion ? 0 : 200,
      easing: EASING,
      useNativeDriver: true,
    }).start();
  }, [appear, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
      }}
    >
      <Text style={styles.title} accessibilityRole="header">
        {step.title}
      </Text>
      <Text style={styles.body}>{step.body}</Text>
      <Text style={styles.tagalog}>{step.bodyTagalog}</Text>
      {tapHint && (
        <View style={styles.hint}>
          <Icon name={icons.tap} size={18} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.hintText}>{TAP_HINT.english}</Text>
            <Text style={styles.hintTagalog}>{TAP_HINT.tagalog}</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    ring: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: radius.lg + 3,
    },
    card: {
      position: 'absolute',
      left: EDGE,
      right: EDGE,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    // The card's pointer: a small square turned 45°, sharing the card's border on one side.
    arrow: {
      position: 'absolute',
      width: 12,
      height: 12,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      transform: [{ rotate: '45deg' }],
    },
    arrowUp: {
      top: -7,
      borderTopWidth: 1,
      borderLeftWidth: 1,
    },
    arrowDown: {
      bottom: -7,
      borderBottomWidth: 1,
      borderRightWidth: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 18,
      paddingRight: 8,
      paddingTop: 8,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    progress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    counter: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    counterNow: {
      fontWeight: '800',
      color: colors.primary,
    },
    track: {
      width: 72,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    close: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: 18,
    },
    body: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
      marginTop: 6,
      paddingHorizontal: 18,
    },
    tagalog: {
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
      marginTop: 4,
      paddingHorizontal: 18,
    },
    hint: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      marginHorizontal: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
    },
    hintText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    hintTagalog: {
      fontSize: 13,
      color: colors.primary,
      marginTop: 2,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    quietButton: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderRadius: radius.md,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    quietText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },
    primaryButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 20,
      paddingRight: 14,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    primaryText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    busy: {
      opacity: 0.6,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
