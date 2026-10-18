# One-tap SOS

For emergencies where a resident has no time to choose a category, describe what is happening,
or take a photo. An SOS sends only the resident's location (and their account, if they have one)
and always arrives as **Critical** on the Command Dashboard.

## How residents start it

All three open the same screen, `banabaconnect://sos` (`apps/mobile/src/app/sos.tsx`):

- **Home-screen widget.** iPhone: a small red "Send SOS" widget, plus a round Lock Screen widget.
  Android: a 2×2 red "SOS" widget. Add it the usual way: long-press the home screen, then Widgets,
  then BanabaConnect.
- **App icon shortcut.** Long-press the BanabaConnect icon, then **Send SOS**. On Android the
  shortcut can also be dragged onto the home screen as its own icon.
- **Home tab.** The red **Send SOS** button under "May emergency?".

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

**No volume-button pattern.** iPhones don't let apps detect volume buttons in the background,
and Android only allows it through an accessibility service, which Google Play restricts to
accessibility apps. The widget and the icon shortcut are the supported fast paths.

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
