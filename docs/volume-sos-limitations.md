# Volume-button SOS and Back Tap: limitations

Notes from building and testing the hands-free ways to open Send SOS (October 18, 2026).
How the feature works is in `docs/sos.md`.

## What was built

- **Android:** press volume **up, down, up, down within 2 seconds** (either button first). The
  phone buzzes twice and opens the normal SOS screen, which asks for the fingerprint or PIN as
  usual. It's an accessibility service in `apps/mobile/modules/volume-sos` that listens only to
  the volume keys.
- **iPhone:** no volume pattern. The Profile tab explains how to set up Back Tap (tap the back of
  the iPhone three times) to run a Shortcut that opens `banabaconnect://sos`.
- **Profile tab:** a card that shows On/Off on Android and opens Settings, or shows the Back Tap
  steps on iPhone.
- **SOS screen:** when it opens behind the lock screen, the fingerprint prompt waits until the
  phone is unlocked.

## What was tested

- Typecheck, lint and the Kotlin build pass.
- On the Android emulator (Pixel 8 image), a simulated USB volume device pressed the pattern, and
  SOS opened with the fingerprint prompt when:
  - the app was in the background;
  - the app's screen was closed but its process was still running;
  - the process had restarted cold.
- `adb shell input keyevent` keys never reach accessibility services, so they can't be used to
  test this.
- Once, right after a reinstall, the pattern opened Home instead of SOS. It didn't happen again.
- **Not tested:** the lock screen, a real Android phone, anything on iPhone.

## Android limitations

- **Residents must turn it on themselves** in Settings → Accessibility. The app can't do it.
- **"Restricted setting" (Android 13 and later).** Android blocks accessibility services for
  apps installed from a downloaded APK, which is how test builds are installed. The resident
  first opens App info → ⋮ → **Allow restricted settings**. The Profile card explains this.
  Apps installed from Google Play don't get this block.
- **Floating button.** Turning the service on also added a round BanabaConnect accessibility
  button at the side of the screen on the emulator. Tapping it can turn the service off. The
  Profile card tells residents to remove it by turning off the **shortcut** on the same
  Settings page; the service stays on.
- **Force stop turns it off** (confirmed on the emulator). Phone cleaners and battery savers on
  some brands may do the same. The Profile card then shows **Off** and the resident turns it on
  again.
- **The screen must be on.** The lock screen counts. With the screen off, Android most likely
  doesn't pass the keys to the service, so the resident presses the power button first. This
  comes from how Android routes keys; it wasn't tested.
- **Two steps on the lock screen.** The phone buzzes and SOS opens behind the lock. The resident
  unlocks the phone, then confirms with the fingerprint.
- **Phone brands vary.** Samsung, Xiaomi and others may handle accessibility services or volume
  keys differently. Test on real phones before relying on it.
- **Google Play.** Play limits accessibility services that aren't accessibility tools. It needs
  the Accessibility API declaration and a video, and review can still reject it (see
  `docs/release-checklist.md`).
- **Debug builds open slowly from a cold start** (about 20 seconds on the emulator) while Metro
  sends the bundle. Release builds don't wait for Metro.

## iPhone limitations

- **No volume pattern.** iOS doesn't let any app see the volume buttons unless the app is open.
- **Back Tap is a manual setup** for each resident: make a Shortcut, then turn on Back Tap. Some
  residents won't do it.
- **Action button** (setting it to run the same Shortcut) only exists on iPhone 15 Pro and newer.
- **Shortcuts may ask permission** to open BanabaConnect the first time it runs.
- **A triple tap can happen by accident**, such as setting the phone down hard. Face ID or the
  passcode stops it from sending.

## Both platforms

- **Not discreet.** It opens the SOS screen and asks for the fingerprint or PIN. A silent mode
  (send in the background without opening a screen or calling 911) was discussed and left for
  later.
