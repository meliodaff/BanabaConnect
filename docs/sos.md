# One-tap SOS

For emergencies where a resident has no time to choose a category, describe what is happening,
or take a photo. An SOS sends only the resident's location (and their account, if they have one)
and always arrives as **Critical** on the Command Dashboard.

## How residents start it

All of these open the same screen, `banabaconnect://sos` (`apps/mobile/src/app/sos.tsx`):

- **Home-screen widget.** iPhone: a small red "Send SOS" widget, plus a round Lock Screen widget.
  Android: a 2×2 red "SOS" widget. Add it the usual way: long-press the home screen, then Widgets,
  then BanabaConnect.
- **App icon shortcut.** Long-press the BanabaConnect icon, then **Send SOS**. On Android the
  shortcut can also be dragged onto the home screen as its own icon.
- **Home tab.** The red **Send SOS** button under "May emergency?".
- **Volume buttons (Android).** Press volume **down 5 times** within 3 seconds, even on the lock
  screen. The phone buzzes twice and opens the SOS screen; on the
  lock screen it waits until the phone is unlocked, then asks for the fingerprint as usual. Off
  until the resident turns it on: Profile tab → **Volume-button SOS** → **Turn on in Settings**.
- **Back Tap (iPhone).** Tapping the back of the iPhone three times runs a Shortcut that opens
  the link. The resident sets it up once; the steps are on the Profile tab. On iPhone 15 Pro and
  later the Action button can run the same Shortcut.

## What happens

1. The screen starts finding the location right away.
2. It asks for the phone's own lock: fingerprint, face, or the phone's PIN, pattern or password.
   The PIN is always allowed, so a wet or injured finger never blocks a real emergency. If the
   resident cancels, nothing is sent and the button stays on screen.
3. Once confirmed, it is sent as soon as there is a location (a recent last-known one counts).
   It goes through the same queue as other reports, so it also works offline, and it is sent
   before any other waiting report.
4. Then the phone calls **911**. It gives the upload up to 3 seconds first, because on some
   networks mobile data stops during a call; if it isn't through by then, the call starts anyway
   and the SOS sends when it can. Apps can't place a call to an emergency number by themselves:
   Android opens the dialer with 911 filled in and the resident presses Call, and iPhone asks
   "Call 911?". If saving the SOS fails, the call still opens.
5. A second SOS from the same place within 15 minutes asks first ("You already sent an SOS"),
   but is never blocked.

**Phones with no screen lock.** The app can't confirm who is holding the phone, so the resident
holds the button for 3 seconds instead. The dashboard then shows **Owner not confirmed** on the
report, and staff should call to check.

**What the check does and doesn't do.** It stops a child playing with a parent's or guardian's
phone from sending one by accident. It does not identify the person: anyone who knows the
phone's PIN can pass it.

## Volume-button SOS (Android)

An Android accessibility service, `apps/mobile/modules/volume-sos` (a local Expo module), watches
only the volume keys. It doesn't read the screen or typed text, and it never swallows a key, so
the volume still changes (5 presses turn it down a little). A volume-up press in between starts
the count again. Every caught pattern buzzes; within 3 seconds of opening the screen, another
one only buzzes, so a long burst opens it once.

- **Why one button.** The first version used up, down, up, down. Pressing the two buttons fast
  overlaps them, and phones treat both volume keys held together as a key combination: on a
  tester's phone it started a bug report, and on others it starts the accessibility shortcut.
  Android handles those combinations before the service sees the keys, so the app can't stop
  them. One button can't overlap with itself.
- **Accidental opens.** Turning the volume down fast can sometimes reach 5 presses. That only
  opens the SOS screen: nothing is sent without the fingerprint or PIN, and X closes it.

- **Turning it on.** Apps can't turn an accessibility service on themselves. The Profile tab
  card opens Settings → Accessibility; the resident turns on **BanabaConnect volume-button SOS**.
  The card shows **On** or **Off** and checks again whenever the app comes back.
- **"Restricted setting" (Android 13 and later).** Android blocks accessibility services for
  apps installed from a downloaded APK, which is how test builds are installed. The resident
  opens App info → ⋮ → **Allow restricted settings**, then turns it on. The card says this and
  links to App info. Apps installed from Google Play don't get this block.
- **Screen off.** Android only passes the volume keys to the service while the screen is on (the
  lock screen counts); with the screen off they go straight to the volume or the media player
  (confirmed on a Redmi Note 12). The resident presses the power button first. For screen-off
  emergencies, the Profile card points to the phone's own Emergency SOS (press power 5 times),
  which can call 911 but can't open BanabaConnect. Catching volume keys with the screen off would
  mean pretending to play music all the time, which drains the battery, fights real music apps
  and breaks Google Play rules, so the app doesn't do it.
- **Own process.** The service runs in a separate `:volumesos` process with no screens and no
  JavaScript, so swiping the app away (which kills the app's process) doesn't kill it. Inside the
  service, use only Android APIs; nothing from the app's process.
- **"Volume-button SOS is ready" notification.** On the Redmi Note 12, swiping the app away still
  stopped the service, even in its own process. While the feature is on, a silent notification
  (`VolumeSosReadyService`, a `specialUse` foreground service in the same `:volumesos` process)
  tells Android that process is in use, so phones are much less likely to kill it. Tapping it
  opens the Profile tab. Android 12 and later don't let the service start it from the background,
  so the app also starts it whenever it comes to the front (`useKeepVolumeSosReady` in the root
  layout). On Android 13 and later it only shows if the app may post notifications; the Profile
  card asks right after the feature is turned on. Google Play needs a declaration for the
  `specialUse` type (see `docs/release-checklist.md`).
- **Floating button.** On recent Android versions, turning the service on also adds a round
  BanabaConnect accessibility button at the side of the screen. Tapping it can turn the service off,
  so the Profile card tells the resident how to remove it (turn off the **shortcut** on the same
  Settings page; the service stays on).
- **Swiped away from recent apps.** On Xiaomi, Redmi and POCO phones (and some other brands),
  swiping BanabaConnect away kills the service, and Xiaomi doesn't let Android start it again
  unless the app has **Autostart**. Settings still shows it as on. The Profile card checks
  whether the service is actually running and shows **Stopped** (turn it off and on again in
  Settings), and while it is on it shows how to keep it running: **Turn on Autostart** (opens
  Xiaomi's Autostart list) and Battery saver → **No restrictions**; on other phones, App info →
  Battery → **Unrestricted**. Found on a Redmi Note 12.
- **Force stop turns it off.** Android turns an accessibility service off when its app is
  force-stopped (App info → Force stop), and some phone brands' cleaners or battery savers do the
  same. The Profile card then shows **Off**, and the resident turns it on again.
- **iPhone.** iOS doesn't let any app see the volume buttons unless it is open, so the iPhone
  uses Back Tap instead (above).

Google Play limits accessibility services that aren't accessibility tools; see
`docs/release-checklist.md` before publishing there.

## On the dashboard

- The category reads **SOS**, with priority 100 (Critical), whoever sent it.
- With **Sound for new reports** on (Settings), an SOS plays a siren instead of the usual beeps,
  so staff can tell it apart without looking. **Play the SOS siren** in Settings plays it once.
- The report page opens with a red notice: send help to the location, call the resident (a
  **Call** button when there is a number), and whether the phone's owner was confirmed.
- "Why this priority" explains that an SOS is always Critical instead of showing the formula.

## Setup

1. In Supabase → SQL Editor, run these as **separate** runs, in order:
   1. `supabase/migrations/20261019000000_sos_category.sql` (adds the `sos` category; it must be
      committed before the next file uses it).
   2. `supabase/migrations/20261019000001_sos_reports.sql` (priority, the phone-lock column, and
      `submit_report`).
2. Then deploy the dashboard. It reads the new `phone_lock_confirmed` column, so it fails if
   deployed before step 1.
3. Build a new development or release build (version 1.0.8). The widgets, the shortcut and
   Face ID need native code; none of them work in Expo Go.

Older apps keep working after the migrations: they don't send the new phone-lock field, and
they don't show SOS reports they didn't send.

## Testing on iPhone

The iPhone widget is a separate app extension (`ph.banabaconnect.app.ExpoWidgetsTarget`) that
shares an App Group (`group.ph.banabaconnect.app`) with the app. Signing needs both. A free
Apple account, as used with AltStore, allows only a few app IDs, and `expo-widgets` also adds
the Push Notifications entitlement. If the build won't sign or install, test the widget with a
paid Apple Developer account (see `docs/release-checklist.md`).
