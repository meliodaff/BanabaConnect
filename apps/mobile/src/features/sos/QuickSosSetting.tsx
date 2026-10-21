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
      <View style={styles.pair}>
        <Text style={styles.text}>
          Press the volume down button 5 times, fast. Send SOS opens, even if your phone is locked.
        </Text>
        <Text style={styles.tagalog}>
          Pindutin ang volume down nang 5 beses, mabilis. Bubukas ang Send SOS kahit naka-lock ang
          phone mo.
        </Text>
      </View>
      <View style={styles.pair}>
        <Text style={styles.text}>
          Your phone buzzes twice. Nothing is sent until you confirm with your fingerprint or PIN.
        </Text>
        <Text style={styles.tagalog}>
          Magva-vibrate ito nang dalawang beses. Walang maipapadala hangga&apos;t hindi mo
          kinukumpirma gamit ang fingerprint o PIN.
        </Text>
      </View>

      {state === 'on' && (
        <Text style={styles.text}>
          A small BanabaConnect notification stays at the top of your screen. It keeps this working
          even after you close the app.
        </Text>
      )}

      {state === 'stopped' && (
        <>
          <View style={styles.pair}>
            <Text style={styles.steps}>
              It stopped working. The volume button won&apos;t open Send SOS until you fix it:
            </Text>
            <Text style={styles.tagalog}>
              Huminto ito. Hindi bubukas ang Send SOS sa volume button hangga&apos;t hindi mo ito
              inaayos:
            </Text>
          </View>
          <Text style={styles.steps}>1. Tap Turn it back on in Settings below.</Text>
          <Text style={styles.steps}>
            2. Tap <Text style={styles.bold}>BanabaConnect volume-button SOS</Text>.
          </Text>
          <Text style={styles.steps}>3. Turn the switch off, then on again.</Text>
          <Text style={styles.note}>
            This happens when you tap Stop on BanabaConnect under Active apps, or when your phone
            closes apps to save battery.
          </Text>
        </>
      )}

      {!enabled && (
        <>
          <View style={styles.pair}>
            <Text style={styles.steps}>To turn it on:</Text>
            <Text style={styles.tagalog}>Paano ito i-on:</Text>
          </View>
          <Text style={styles.steps}>1. Tap Turn on in Settings below.</Text>
          <Text style={styles.steps}>
            2. Tap <Text style={styles.bold}>Downloaded apps</Text> (on some phones,{' '}
            <Text style={styles.bold}>Installed apps</Text>).
          </Text>
          <Text style={styles.steps}>
            3. Tap <Text style={styles.bold}>BanabaConnect volume-button SOS</Text> and turn the
            switch on.
          </Text>
          <Text style={styles.steps}>
            4. Android asks if you trust it. Tap <Text style={styles.bold}>Allow</Text>.
          </Text>
          <Text style={styles.note}>
            It only watches the volume buttons. It can&apos;t see your screen or what you type.
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
          See a round BanabaConnect button at the side of your screen? It can turn this off by
          accident. To remove it, tap Turn off in Settings, tap{' '}
          <Text style={styles.bold}>BanabaConnect volume-button SOS</Text>, and turn off only the{' '}
          <Text style={styles.bold}>shortcut</Text> switch.
        </Text>
      )}

      {/* Some phones stop background apps to save battery, even with the notification showing. */}
      {enabled && batteryExempt === false && (
        <>
          <Text style={styles.note}>
            Your phone may close BanabaConnect to save battery, which stops this. To prevent it, tap
            the button below, choose <Text style={styles.bold}>All apps</Text>, tap BanabaConnect,
            then <Text style={styles.bold}>Don&apos;t optimize</Text> (on some phones,{' '}
            <Text style={styles.bold}>Unrestricted</Text>).
          </Text>
          <Pressable
            onPress={() => VolumeSos?.openBatterySettings?.()}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityHint="Opens battery settings in your phone's Settings"
          >
            <Text style={styles.buttonText}>Keep it running</Text>
          </Pressable>
        </>
      )}

      {/* Android 13 and later block this for apps installed from a downloaded file. */}
      {!enabled && Number(Platform.Version) >= 33 && (
        <Text style={styles.note}>
          Android says &quot;Restricted setting&quot; and won&apos;t let you turn it on? Tap{' '}
          <Text
            style={styles.link}
            onPress={() => void Linking.openSettings()}
            accessibilityRole="link"
          >
            App info
          </Text>
          , tap ⋮ at the top right, then <Text style={styles.bold}>Allow restricted settings</Text>.
          Then try again.
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
    // An English line with its Tagalog line right under it.
    pair: {
      gap: 2,
    },
    tagalog: {
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
    },
    // Names the resident will see on a Settings screen, so they can find them.
    bold: {
      fontWeight: '700',
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
