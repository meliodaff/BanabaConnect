# Installing BanabaConnect on iPhone with AltStore Classic

AltStore Classic installs apps that aren't on the App Store. It signs the app with each person's own
Apple ID, so the build doesn't need an Apple Developer account. Apps installed this way **expire
after 7 days** unless AltStore refreshes them, so this is for testing, not for residents at large.

The **iOS build for AltStore** workflow builds the app on GitHub and publishes it as a GitHub Release.
The repo must be **public** so AltStore can download the release files.

## 1. One-time setup

In the BanabaConnect repo, go to **Settings → Secrets and variables → Actions → New repository
secret** and add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the same
values as `apps/mobile/.env.local`). Without them, sign-in won't work in the built app.

## 2. Publish a version

1. Make sure `version` in `apps/mobile/app.json` is new (e.g. `1.0.1` after `1.0.0`). The workflow
   stops if a release for that version already exists, because AltStore only offers an update when
   the version changes. Commit and push the change.
2. Open **Actions → iOS build for AltStore → Run workflow**, pick the branch, and write the
   **release notes** shown in AltStore.
3. Wait about 20–30 minutes. The workflow creates a release such as `v1.0.1` with
   `BanabaConnect.ipa`, `source.json` and `icon.png` attached.

## 3. Install on an iPhone

1. On a Windows PC, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store),
   then install **AltServer** from altstore.io.
2. Connect the iPhone by USB, and use AltServer's tray icon → **Install AltStore** → choose the iPhone.
3. On the iPhone, trust the developer profile (Settings → General → VPN & Device Management) and turn
   on Developer Mode if asked.
4. In AltStore, go to **Sources → +** and add:

   ```
   https://github.com/meliodaff/BanabaConnect/releases/latest/download/source.json
   ```

   Then install BanabaConnect. New releases show up as updates automatically.
5. Keep the PC with AltServer on the same Wi-Fi at least once a week so AltStore can refresh the app.

## Notes

- **Permissions must match.** `source.json` lists the app's permissions, read from the built app by
  `scripts/altstore-source.js`. AltStore refuses to install if they don't match, so don't edit the
  permissions by hand. To change the descriptions or colors, edit `source.template.json`.
- **Google sign-in** works in this build: it returns to `banabaconnect://auth/callback`, which is
  already allowed in Supabase.
