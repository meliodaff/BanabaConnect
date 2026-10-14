# Background report sending

Version 1.0.7 adds iOS file-backed background uploads for report text. The previous 1.0.6
change only scheduled a worker through `expo-background-task` and `expo-task-manager`;
that worker does not run immediately when Wi-Fi returns. Build and install 1.0.7 to test
the new upload path.

When a report is saved, iOS receives an authenticated JSON upload through
`File.createUploadTask` with `sessionType: 'background'`, even if the phone is offline.
The native background URLSession waits for connectivity and can transfer while JavaScript
is suspended. Each report is handed off independently; a waiting upload does not block
later reports. The report remains queued in SQLite until a successful HTTP response.
Non-2xx responses and network errors retain it for retry.

This requires a saved reporting session. Opening the app with internet prepares a guest
session if necessary; simultaneous startup and Send share that authentication request.
A first-ever offline launch cannot create an authenticated server request. An expired
session or token that expires while waiting can require a later authenticated retry.
Authentication credentials are sent in request headers, not in the temporary JSON file.

Photo upload and attachment still run through the queue after the text is accepted.
If JavaScript remains suspended when the native text transfer completes, the saved status
and photos may wait for a subsequent execution window or reopening. This change does not
provide independent background photo uploads or restore JS upload handles after process
termination. SQLite and server UUID deduplication allow safe retry after relaunch.

The task is defined in `apps/mobile/index.js` before Expo Router loads, so an OS launch can
send saved reports without mounting screens. Opening the app registers the worker. The same
queue sends urgent text reports first, then photos, using the current resident or guest session
saved on the phone. Other accounts' saved reports wait for their owner to sign back in.

Each success or retry is saved immediately. If iOS ends the task's execution window, it stops
starting new uploads and the unfinished work remains queued. Repeated delivery uses the same
report UUID and the existing server duplicate protection. Background work avoids navigation,
toasts, and status polling; returning to the app reloads the saved delivery state.

## Timing limits

The requested interval is 15 minutes, but the operating system decides when work actually runs.
It is **not** a promise to send 15 minutes later or immediately when connection returns. iOS can
delay work substantially depending on battery, network, and usage. Swiping the app away in the
iPhone app switcher cancels native background transfers and stops scheduled background work
until the app is reopened. Android timing
also depends on battery restrictions and device vendor settings.

The foreground queue still tries immediately on reconnect and when the app is reopened.
On Android, a reconnect event also tries sending while the app is backgrounded if its JavaScript
process is still running. Android can suspend that process; the native worker provides a later
opportunity to send in that case.

References:
- https://docs.expo.dev/versions/v57.0.0/sdk/background-task/
- https://docs.expo.dev/versions/latest/sdk/filesystem/
- https://developer.apple.com/documentation/foundation/urlsessionconfiguration/background(withidentifier:)

## Android emulator

Expo Go (`host.exp.exponent`) cannot run this native background worker. Keeping Expo Go in the
recent apps list does not enable background tasks. Install the actual BanabaConnect debug app
(`ph.banabaconnect.app`) on the emulator first:

```sh
npm run android:build --workspace @banabaconnect/mobile
npm run android --workspace @banabaconnect/mobile
```

The first command needs the Android SDK and Java; it generates the ignored native project and
installs the app. Rebuild after native dependency or app configuration changes. The second starts
the development server and explicitly targets the native app. To use Expo Go for foreground UI
testing instead, pass `-- --go` to the second command.

For a controlled background-worker test, leave BanabaConnect using Home, then inspect its job:

```sh
adb shell dumpsys jobscheduler
adb shell cmd jobscheduler run -f ph.banabaconnect.app <JOB_ID>
```

Choose the job for `ph.banabaconnect.app` using WorkManager's `SystemJobService`, not a job for
Expo Go. Forcing the job tests execution without waiting for the 15-minute minimum delay; it
does not establish how soon Android will schedule it naturally. A native debug build still
needs its development server for a fresh JavaScript launch. Use a release APK to test without
the development server.

## Checks before accepting the iPhone build

Run `npm run test:sync --workspace @banabaconnect/mobile`, typecheck, and mobile lint.
These checks exercise queue behavior with mocked native APIs; they do not establish when a
physical iPhone will perform native transfers or schedule the worker.

1. Build version 1.0.7 with the existing **iOS build for AltStore** workflow and install it.
   Open it with internet to prepare authentication and register the worker. Retain the
   existing install and its saved reports.
2. In airplane mode, save a report with a photo. Leave the app using the Home gesture, without
   swiping it away. Restore connection while using another app.
3. Keep the dashboard open and record when the report text arrives and when its photo arrives.
   Confirm exactly one report is created. Record text and photo delivery separately and
   record elapsed time. Text should use the native handoff rather than wait for the worker;
   iOS still decides when the transfer executes. Photos can require a later execution window.
4. Reopen the app and confirm the delivery state matches the dashboard. Repeat five times,
   including a guest report, a signed-in resident, and several queued reports.
5. Repeat after swiping the app away. The report should remain saved and send when reopened;
   background delivery is not expected in this case.

For a debug native build on a physical iPhone, Expo's
`BackgroundTask.triggerTaskWorkerForTestingAsync()` can trigger the worker for a controlled
queue test. It does not work in the release build produced by the AltStore workflow and does
not validate natural OS scheduling.
