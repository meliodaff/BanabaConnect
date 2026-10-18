import { router } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeEventSubscription,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReportSubmission } from '@banabaconnect/shared';
import { Icon, icons } from '@/components/Icon';
import { LocationBanner } from '@/components/LocationBanner';
import { PlainStatusBar } from '@/components/PlainStatusBar';
import { useReduceMotion } from '@/components/useReduceMotion';
import { currentReportOwner } from '@/features/auth/guestSession';
import { callNumber, NATIONAL_EMERGENCY_NUMBER } from '@/features/hotlines/call';
import { saveReport } from '@/features/queue/reportRepository';
import { reportsStore } from '@/features/queue/reportsStore';
import { requestSync } from '@/features/queue/syncEngine';
import { buildSubmission } from '@/features/report/buildSubmission';
import { findRecentDuplicate } from '@/features/report/recentDuplicate';
import { useReportLocation, type ReportCoords } from '@/features/report/useReportLocation';
import { confirmPhoneOwner, hasScreenLock } from '@/features/sos/confirmOwner';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

// Phones without a screen lock: a long, deliberate press stands in for the fingerprint or PIN.
const HOLD_TO_SEND_MS = 3000;
// How long the 911 call waits for the SOS to upload. On some networks mobile data stops during a
// call, so a few seconds first usually gets it to the barangay before the call starts. If it
// isn't through by then, the call starts anyway and the queue sends the SOS when it can.
const SEND_BEFORE_CALL_MS = 3000;

/** Gives the upload a short head start, then opens the call to 911. */
async function callAfterUpload(upload: Promise<void>) {
  const headStart = new Promise((done) => setTimeout(done, SEND_BEFORE_CALL_MS));
  await Promise.race([upload.catch(() => undefined), headStart]);
  await callNumber(NATIONAL_EMERGENCY_NUMBER);
}

/** Whether the owner check has happened, and how. `null` until it has. */
type Confirmation = { phoneLockConfirmed: boolean } | null;

/**
 * One-tap SOS, opened from the home-screen widget, the app icon shortcut, the volume buttons
 * (Android), Back Tap (iPhone), or the Home tab (banabaconnect://sos). No category or details: the resident may have no time to say what is
 * happening. The phone's own lock confirms it, then it is sent as soon as there is a location and
 * the phone calls 911 (callAfterUpload).
 */
export default function SosScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { location, retryLocation } = useReportLocation();
  const [lock, setLock] = useState<'checking' | 'present' | 'none'>('checking');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [asking, setAsking] = useState(false);
  const askedOnOpen = useRef(false);
  const sendStarted = useRef(false);
  const coords = location.coords;

  const askForLock = useCallback(async () => {
    setAsking(true);
    try {
      const result = await confirmPhoneOwner();
      if (result === 'confirmed') setConfirmation({ phoneLockConfirmed: true });
      if (result === 'noLock') setLock('none');
    } finally {
      setAsking(false);
    }
  }, []);

  // Ask right away: from the widget, the fingerprint prompt is the only step. Opened by the volume
  // buttons on the lock screen, the screen waits behind the lock, so ask once the phone is unlocked.
  useEffect(() => {
    let closed = false;
    let subscription: NativeEventSubscription | undefined;
    function askOnce() {
      if (askedOnOpen.current) return;
      askedOnOpen.current = true;
      void askForLock();
    }
    void hasScreenLock().then((present) => {
      if (closed) return;
      setLock(present ? 'present' : 'none');
      if (!present) return;
      if (AppState.currentState === 'active') {
        askOnce();
        return;
      }
      subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') askOnce();
      });
    });
    return () => {
      closed = true;
      subscription?.remove();
    };
  }, [askForLock]);

  // Saved on the phone first, like every report, so it survives no signal and restarts. Then
  // 911 is called, whether or not saving worked: the call never waits on the app.
  async function save(submission: ReportSubmission, call = true) {
    try {
      await saveReport(submission, null, await currentReportOwner());
      await reportsStore.refresh();
    } catch (error) {
      console.warn('Could not save SOS', error);
      if (call) void callNumber(NATIONAL_EMERGENCY_NUMBER);
      // Already confirmed, so retrying the same SOS needs no second fingerprint. The resident
      // sees this when they come back from the call.
      Alert.alert(
        'SOS not saved',
        'Something went wrong on this phone, so the barangay did not get your SOS. Try again.',
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Try again', onPress: () => void save(submission, false) },
        ],
        { cancelable: false },
      );
      return;
    }
    // The sent screen is what the resident comes back to after the call.
    router.replace({ pathname: '/report/sent', params: { id: submission.id } });
    const upload = requestSync({ ignoreBackoff: true });
    if (call) void callAfterUpload(upload);
  }

  const send = useEffectEvent((phoneLockConfirmed: boolean, at: ReportCoords) => {
    if (sendStarted.current) return;
    sendStarted.current = true;
    const submission: ReportSubmission = {
      ...buildSubmission({ category: 'sos', coords: at, description: '', minutesAgo: 0 }),
      phoneLockConfirmed,
    };
    const duplicate = findRecentDuplicate(submission, reportsStore.getState().reports);
    if (!duplicate) {
      void save(submission);
      return;
    }
    // A second tap on the widget is most likely an accident; never block it, though.
    const minutes = Math.max(1, Math.round(duplicate.minutesAgo));
    Alert.alert(
      'You already sent an SOS',
      `You sent one from here ${minutes === 1 ? '1 minute' : `${minutes} minutes`} ago. Send another only if you still need help.`,
      [
        {
          text: 'See my SOS',
          onPress: () =>
            router.replace({ pathname: '/reports/[id]', params: { id: duplicate.report.submission.id } }),
        },
        { text: 'Send another', onPress: () => void save(submission) },
      ],
      { cancelable: false },
    );
  });

  // Send as soon as it is confirmed and there is any location, even a last known one. Once only.
  useEffect(() => {
    if (confirmation && coords) send(confirmation.phoneLockConfirmed, coords);
  }, [confirmation, coords]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const waitingForLocation = confirmation !== null && !coords;
  // Confirmed with a location: saving and handing it to the queue, which takes a moment.
  const saving = confirmation !== null && coords !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <PlainStatusBar />
      <View style={styles.topBar}>
        <Pressable
          onPress={close}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close without sending"
          style={styles.closeButton}
        >
          <Icon name={icons.close} size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Icon name={icons.sos} size={72} color={colors.emergency} />
          <Text style={styles.title}>Send SOS</Text>
          <Text style={styles.tagalog}>Humingi ng tulong agad</Text>
          <Text style={styles.lead}>
            For when you can&apos;t say what is happening. Barangay Banaba gets your location right away
            as the most urgent report, and your phone calls {NATIONAL_EMERGENCY_NUMBER}.
          </Text>
        </View>

        <LocationBanner location={location} onRetry={retryLocation} />

        {saving || waitingForLocation ? (
          <View
            style={[styles.statusBox, { backgroundColor: colors.emergencySoft }]}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator color={colors.emergencyText} />
            <Text style={[styles.statusText, { color: colors.emergencyText }]}>
              {waitingForLocation
                ? `Confirmed. Sending and calling ${NATIONAL_EMERGENCY_NUMBER} as soon as your location is found…`
                : `Sending your SOS, then calling ${NATIONAL_EMERGENCY_NUMBER}…`}
            </Text>
          </View>
        ) : lock === 'checking' ? (
          <ActivityIndicator color={colors.emergency} style={styles.checking} />
        ) : lock === 'present' ? (
          <Pressable
            onPress={() => void askForLock()}
            disabled={asking}
            style={({ pressed }) => [styles.sendButton, (pressed || asking) && styles.pressed]}
            accessibilityRole="button"
            accessibilityHint={`Asks for your fingerprint, face, or phone PIN, then sends the SOS and calls ${NATIONAL_EMERGENCY_NUMBER}`}
          >
            <Icon name={icons.fingerprint} size={26} color={colors.onEmergency} />
            <Text style={styles.sendText}>Confirm with fingerprint or PIN</Text>
          </Pressable>
        ) : (
          <HoldToSend onDone={() => setConfirmation({ phoneLockConfirmed: false })} />
        )}

        <Text style={styles.note}>
          {lock === 'none'
            ? "This phone has no screen lock, so the barangay will see that the phone's owner wasn't confirmed and may call to check."
            : "The phone's own lock confirms it's you, so a child playing with the phone can't send one by accident."}
          {` Then the phone opens a call to ${NATIONAL_EMERGENCY_NUMBER}; press Call if it asks.`}
        </Text>

        <Pressable
          onPress={() => callNumber(NATIONAL_EMERGENCY_NUMBER)}
          style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Icon name={icons.phone} size={22} color={colors.emergencyText} />
          <View style={styles.flex}>
            <Text style={styles.callTitle}>Call {NATIONAL_EMERGENCY_NUMBER} now, without sending</Text>
            <Text style={styles.callText}>Calls work without internet.</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** A button that sends only after being held down for 3 seconds, with the progress shown. */
function HoldToSend({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  function start() {
    setHolding(true);
    progress.setValue(0);
    animation.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_TO_SEND_MS,
      // The fill is how the resident knows to keep holding, so it stays even with reduced motion.
      easing: reduceMotion ? Easing.step0 : Easing.linear,
      useNativeDriver: false,
    });
    animation.current.start(({ finished }) => {
      if (finished) onDone();
    });
  }

  function stop() {
    setHolding(false);
    animation.current?.stop();
    progress.setValue(0);
  }

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      style={styles.sendButton}
      accessibilityRole="button"
      accessibilityLabel="Hold for 3 seconds to send SOS"
      accessibilityActions={[{ name: 'activate', label: 'Send SOS' }]}
      // Screen readers can't hold; their double tap sends it.
      onAccessibilityAction={onDone}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.holdFill,
          { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
      <Icon name={icons.sos} size={26} color={colors.onEmergency} />
      <Text style={styles.sendText}>{holding ? 'Keep holding…' : 'Hold for 3 seconds to send'}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 4 },
    closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingTop: 0, gap: 16 },
    hero: { alignItems: 'center', gap: 4, paddingVertical: 8 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 8 },
    tagalog: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
    lead: { fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 8, lineHeight: 21 },
    checking: { paddingVertical: 24 },
    sendButton: {
      minHeight: 64,
      borderRadius: radius.lg,
      backgroundColor: colors.emergency,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },
    holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
    sendText: { fontSize: 18, fontWeight: '800', color: colors.onEmergency },
    pressed: { opacity: 0.85 },
    statusBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 16 },
    statusText: { flex: 1, fontSize: 16, fontWeight: '700' },
    note: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    callButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    callTitle: { fontSize: 16, fontWeight: '700', color: colors.emergencyText },
    callText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}
