import { useEffect } from 'react';
import { Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, icons } from '@/components/Icon';
import { radius, useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { useVolumeSosBatteryExempt, useVolumeSosState, VolumeSos } from './volumeSos';

const SOS_LINK = 'banabaconnect://sos';

/**
 * Profile tab: the hands-free way to open Send SOS. Android: the volume-button pattern
 * (modules/volume-sos), which the resident turns on in Settings. iPhone: apps can't watch the
 * buttons, so it explains Back Tap with a Shortcut instead.
 */
export function QuickSosSetting() {
  if (Platform.OS === 'android') return VolumeSos ? <VolumeButtonSetting /> : null;
  if (Platform.OS === 'ios') return <BackTapGuide />;
  return null;
}

function VolumeButtonSetting() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const state = useVolumeSosState();
  const enabled = state === 'on' || state === 'stopped';
  const batteryExempt = useVolumeSosBatteryExempt();

  // Android 13 and later hide the ongoing notification without this. The service still runs, but
  // the resident can't see that it's on.
  useEffect(() => {
    if (!enabled || Number(Platform.Version) < 33) return;
    void PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }, [enabled]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name={icons.volume} size={20} color={colors.textMuted} />
        <Text style={styles.title}>Volume-button SOS</Text>
        <View style={styles.status}>
          {state === 'on' && <Icon name={icons.check} size={16} color={colors.success} />}
          {state === 'stopped' && <Icon name={icons.alert} size={16} color={colors.warning} />}
          <Text style={[styles.statusText, !enabled && styles.statusOff]}>
            {state === 'on' ? 'On' : state === 'stopped' ? 'Stopped' : 'Off'}
          </Text>
        </View>
      </View>
      <Text style={styles.text}>
        Press volume down 5 times within 3 seconds, even on the lock screen, to open Send SOS. The
        phone buzzes twice, then you confirm with your fingerprint or PIN as usual.
      </Text>
      <Text style={styles.text}>
        While it&apos;s on, BanabaConnect shows a small notification so it keeps working after you
        close the app.
      </Text>

      {state === 'stopped' && (
        <Text style={styles.steps}>
          It isn&apos;t running, so the volume buttons won&apos;t open Send SOS. This happens after
          Stop in your phone&apos;s Active apps list, or when the phone closes BanabaConnect to save
          battery. In Settings, turn BanabaConnect volume-button SOS off, then on again.
        </Text>
      )}

      {!enabled && (
        <>
          <Text style={styles.text}>
            Android lists it under Accessibility. BanabaConnect only listens for the volume buttons.
            It doesn&apos;t read your screen or what you type.
          </Text>
          <Text style={styles.steps}>
            In Settings, open Downloaded apps (or Installed apps), then BanabaConnect volume-button
            SOS, and turn it on.
          </Text>
        </>
      )}

      <Pressable
        onPress={() => VolumeSos?.openSettings()}
        style={({ pressed }) => [
          styles.button,
          state !== 'on' && styles.buttonPrimary,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityHint="Opens Accessibility in your phone's Settings"
      >
        <Text style={[styles.buttonText, state !== 'on' && styles.buttonTextPrimary]}>
          {state === 'on'
            ? 'Turn off in Settings'
            : state === 'stopped'
              ? 'Turn it back on in Settings'
              : 'Turn on in Settings'}
        </Text>
      </Pressable>

      {/* Android adds this button when the service is turned on; tapping it can turn the service off. */}
      {state === 'on' && (
        <Text style={styles.note}>
          If a round BanabaConnect button appears at the side of your screen, remove it so it isn&apos;t
          tapped by accident: on the same Settings page, turn off BanabaConnect volume-button SOS
          shortcut. Volume-button SOS stays on.
        </Text>
      )}

      {/* Some phones stop background apps to save battery, even with the notification showing. */}
      {enabled && batteryExempt === false && (
        <>
          <Text style={styles.note}>
            If volume-button SOS stops working after you close the app, let BanabaConnect run in
            the background: in the list, choose All apps, then BanabaConnect, then Don&apos;t
            optimize (or Unrestricted).
          </Text>
          <Pressable
            onPress={() => VolumeSos?.openBatterySettings?.()}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityHint="Opens battery settings in your phone's Settings"
          >
            <Text style={styles.buttonText}>Let it run in the background</Text>
          </Pressable>
        </>
      )}

      {/* Android 13 and later block this for apps installed from a downloaded file. */}
      {!enabled && Number(Platform.Version) >= 33 && (
        <Text style={styles.note}>
          If Android says &quot;Restricted setting&quot;, open{' '}
          <Text
            style={styles.link}
            onPress={() => void Linking.openSettings()}
            accessibilityRole="link"
          >
            App info
          </Text>
          , tap the ⋮ menu, choose Allow restricted settings, then try again.
        </Text>
      )}
    </View>
  );
}

function BackTapGuide() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name={icons.tap} size={20} color={colors.textMuted} />
        <Text style={styles.title}>Open SOS by tapping your iPhone</Text>
      </View>
      <Text style={styles.text}>
        Tap the back of your iPhone three times to open Send SOS. You still confirm with Face ID or
        your passcode. Set it up once:
      </Text>
      <Text style={styles.steps}>
        1. In the Shortcuts app, tap +, add the Open URLs action, and type{' '}
        <Text style={styles.code} selectable>
          {SOS_LINK}
        </Text>
        . Name it Send SOS.
      </Text>
      <Text style={styles.steps}>
        2. In Settings, open Accessibility, then Touch, then Back Tap, then Triple Tap, and choose
        Send SOS.
      </Text>
      <Text style={styles.note}>
        iPhone 15 Pro and later: you can also set the Action button to the same shortcut, in
        Settings, then Action Button.
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    statusOff: {
      color: colors.textMuted,
    },
    text: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.textMuted,
    },
    steps: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    code: {
      fontWeight: '700',
      color: colors.text,
    },
    note: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    link: {
      fontWeight: '700',
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    button: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      marginTop: 4,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    buttonTextPrimary: {
      color: colors.onPrimary,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
