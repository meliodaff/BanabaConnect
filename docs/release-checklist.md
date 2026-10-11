# Release checklist

Things to finish before BanabaConnect is released to residents. They were put off on purpose
while the app is only tested by the team (emulator and AltStore), to keep testing simple.

## Accounts and security

- [ ] **Captcha for guest accounts and email sign-in.** Use Cloudflare Turnstile through
  Supabase → Authentication → Attack Protection. This stops scripts from creating thousands of
  fake guest accounts.
  - Needs `react-native-webview`, plus Turnstile's test keys during development.
  - Put the site key in an `EXPO_PUBLIC_` variable and in the GitHub secrets for builds.
  - Create the hidden guest account in the background when the app opens with signal, not when
    someone presses Send, so an emergency report is never held up by the check.
  - Google sign-in isn't affected; email sign-up and sign-in are.
- [ ] **Turn "Confirm email" back on** in Supabase → Authentication → Sign In / Providers → Email,
  if residents should confirm their email address. It was turned off for testing.
- [ ] **Publish the Google sign-in consent screen.** In Google Cloud → Google Auth Platform →
  Audience, it's in "Testing" mode, which only lets the listed test users sign in.
- [ ] **Clean up empty hidden guest accounts.** After a guest's reports move to their real
  account, the guest account owns nothing. Remove these periodically, or add an automatic cleanup.

## Apple App Store requirements

- [ ] **Sign in with Apple** (App Store Review Guideline 4.8). Apps that offer Google sign-in must
  also offer a privacy-focused option.
- [ ] **In-app account deletion** (Guideline 5.1.1). Add "Delete my account" on the Profile tab. It
  needs a server-side function, because deleting an account requires the `service_role` key.
- [ ] **Privacy policy URL.** The app collects phone numbers, locations, photos and Barangay ID
  photos.
- [ ] **Apple Developer account** ($99/year) for TestFlight and the App Store. AltStore is only
  for testing, because apps installed with it expire after 7 days.
- [x] Permission messages for camera, photos and location (in `apps/mobile/app.json`).

## App content

- [ ] **Confirm the app ID** `ph.banabaconnect.app` (`apps/mobile/app.json`). It can't change
  after the first store release.
- [ ] **Full sitio/purok list.** `BARANGAY_AREAS` in `packages/shared/src/profile.ts` only has
  North Libis, South Libis and Dama de Noche.
- [ ] **Replace the draft MCPS values** once the expert panel defines them:
  - severities in `category_severity`;
  - credibility per verification status, the 150 m / 2 hour grouping, and the "5 reports = full
    volume" rule in `supabase/migrations/20261012000000_report_submission.sql`.
- [ ] Optional: **recalculate credibility and priority** when a guest's reports move to a
  verified account. Today they keep the guest score they got when they arrived.
