const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Exercise the actual TS modules with native APIs replaced; no phone or network is needed.
function loadModule(file, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/queue', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function('require', 'module', 'exports', ...Object.keys(globals), outputText)(
    requireMock, module, module.exports, ...Object.values(globals));
  return module.exports;
}

function report(id, category = 'fire', ownerId = 'resident') {
  return {
    submission: { id, category, createdAt: '2026-10-14T00:00:00Z' },
    ownerId, syncStatus: 'queued', attempts: 1, nextAttemptAt: Date.now() + 600_000,
    photo: { uri: `file://${id}.jpg`, syncStatus: 'queued', attempts: 0 },
  };
}

function engineHarness(reports, send = async () => {}, owner = 'resident', enqueue = async () => false, online = true) {
  const events = [];
  const sending = new Set();
  class OfflineError extends Error {}
  const repository = {
    dueReports: async (id, now, ignoreBackoff) => reports.filter((r) =>
      r.ownerId === id && r.syncStatus === 'queued' && (ignoreBackoff || r.nextAttemptAt <= now)),
    duePhotos: async (id) => reports.filter((r) =>
      r.ownerId === id && r.syncStatus === 'sent' && r.photo?.syncStatus === 'queued'),
    markReportSent: async (id) => { reports.find((r) => r.submission.id === id).syncStatus = 'sent'; },
    markPhotoSent: async (id) => { reports.find((r) => r.submission.id === id).photo.syncStatus = 'sent'; },
    markReportRetry: async (id, attempts, nextAttemptAt) => {
      Object.assign(reports.find((r) => r.submission.id === id), { attempts, nextAttemptAt });
    },
    markPhotoRetry: async (id, attempts) => {
      reports.find((r) => r.submission.id === id).photo.attempts = attempts;
    },
  };
  const engine = loadModule('syncEngine.ts', {
    'react-native': { AppState: { currentState: 'active' } },
    '@/features/auth/guestSession': { currentReportOwner: async () => owner },
    './reportRepository': repository,
    './reportsStore': { reportsStore: {
      setSending: (id, on) => { events.push('ui'); if (on) sending.add(id); else sending.delete(id); },
      refresh: async () => events.push('ui'),
    } },
    './statusSync': { refreshStatuses: async () => events.push('status') },
    './syncFeedback': { notifyReportSent: () => events.push('toast') },
    './nativeReportUpload': { enqueueNativeReport: enqueue },
    './transport': { OfflineError, hasConnection: async () => online, transport: {
      sendReport: async (submission) => {
        events.push(`text:${submission.id}`);
        await send(submission, OfflineError);
      },
      uploadPhoto: async (id) => events.push(`photo:${id}`),
    } },
  });
  return { ...engine, events, sending };
}

test('background sync sends urgent text before photos, bypasses backoff, and respects ownership', async () => {
  const reports = [report('road', 'road_blockage'), report('fire'), report('private', 'medical', 'someone-else')];
  const engine = engineHarness(reports);
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.deepEqual(engine.events, ['text:fire', 'text:road', 'photo:fire', 'photo:road']);
  assert.equal(reports[2].syncStatus, 'queued');
});

test('a guest background launch only sends the guest queue', async () => {
  const reports = [report('guest', 'fire', null), report('private')];
  const engine = engineHarness(reports, undefined, null);
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.deepEqual(engine.events, ['text:guest', 'photo:guest']);
  assert.equal(reports[1].syncStatus, 'queued');
});

test('losing signal leaves the report queued for retry and does not upload its photo', async () => {
  const reports = [report('fire')];
  const engine = engineHarness(reports, async (_, OfflineError) => { throw new OfflineError('No connection'); });
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.deepEqual(engine.events, ['text:fire']);
  assert.equal(reports[0].syncStatus, 'queued');
  assert.equal(reports[0].attempts, 2);
  assert.ok(reports[0].nextAttemptAt > Date.now());
});

test('expiration preserves unfinished text and photos, which send in a later execution', async () => {
  const reports = [report('fire'), report('road', 'road_blockage')];
  let expired = false;
  const engine = engineHarness(reports, async () => { expired = true; });
  await engine.requestSync({ background: true, ignoreBackoff: true, shouldContinue: () => !expired });
  assert.deepEqual(engine.events, ['text:fire']);
  assert.equal(reports[0].syncStatus, 'sent');
  assert.equal(reports[0].photo.syncStatus, 'queued');
  assert.equal(reports[1].syncStatus, 'queued');
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.deepEqual(engine.events, ['text:fire', 'text:road', 'photo:fire', 'photo:road']);
});

test('simultaneous foreground/background triggers wait for the queue and send each report once', async () => {
  const reports = [report('fire')];
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  let notifyStarted;
  const started = new Promise((resolve) => { notifyStarted = resolve; });
  const engine = engineHarness(reports, async () => { notifyStarted(); await blocked; });
  const first = engine.requestSync({ background: true, ignoreBackoff: true });
  await started;
  const second = engine.requestSync({ ignoreBackoff: true });
  release();
  await Promise.all([first, second]);
  assert.equal(engine.events.filter((event) => event === 'text:fire').length, 1);
  assert.equal(engine.events.filter((event) => event === 'photo:fire').length, 1);
  assert.ok(engine.events.includes('ui'), 'foreground pass refreshes reports sent in the background');
  assert.ok(engine.events.includes('status'));
});

function taskHarness({ configured = true, available = true, restricted = false, reports = [], syncError = false, expireTask = false } = {}) {
  const callbacks = new Map();
  const registrations = [];
  let expire;
  let cleanedUp = false;
  let synced = false;
  const task = loadModule('backgroundSync.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-task-manager': {
      isTaskDefined: (name) => callbacks.has(name),
      defineTask: (name, callback) => callbacks.set(name, callback),
      isAvailableAsync: async () => available,
    },
    'expo-background-task': {
      BackgroundTaskStatus: { Available: 2 }, BackgroundTaskResult: { Success: 1, Failed: 2 },
      getStatusAsync: async () => restricted ? 1 : 2,
      registerTaskAsync: async (name, options) => registrations.push({ name, options }),
      addExpirationListener: (callback) => {
        expire = callback;
        return { remove: () => { cleanedUp = true; } };
      },
    },
    '@/features/auth/guestSession': { currentReportOwner: async () => 'resident' },
    '@/features/auth/supabase': { supabaseConfigured: configured },
    './reportRepository': { listReports: async (owner) => {
      assert.equal(owner, 'resident');
      return reports;
    } },
    './syncEngine': { requestSync: async (options) => {
      synced = true;
      assert.equal(options.background, true);
      assert.equal(options.ignoreBackoff, true);
      assert.equal(options.shouldContinue(), true);
      if (expireTask) {
        expire();
        assert.equal(options.shouldContinue(), false);
      }
      if (syncError) throw new Error('Storage unavailable');
    } },
  });
  return {
    ...task, registrations, callbacks,
    execute: () => callbacks.get(task.REPORT_SYNC_TASK)({ error: null }),
    get cleanedUp() { return cleanedUp; }, get synced() { return synced; },
  };
}

test('task is defined at bundle load and registers with a native interval in minutes', async () => {
  const task = taskHarness();
  assert.equal(task.callbacks.size, 1);
  await task.registerBackgroundSync();
  assert.deepEqual(task.registrations, [{ name: task.REPORT_SYNC_TASK, options: { minimumInterval: 15 } }]);
});

test('unsupported environments and unconfigured builds do not register a worker', async () => {
  for (const options of [{ configured: false }, { available: false }, { restricted: true }]) {
    const task = taskHarness(options);
    await task.registerBackgroundSync();
    assert.equal(task.registrations.length, 0);
  }
  const unconfigured = taskHarness({ configured: false });
  assert.equal(await unconfigured.execute(), 1);
  assert.equal(unconfigured.synced, false, 'background work cannot simulate a successful delivery');
});

test('expired or failed native execution reports failure and removes its expiration listener', async () => {
  for (const options of [{ expireTask: true }, { syncError: true }]) {
    const task = taskHarness(options);
    assert.equal(await task.execute(), 2);
    assert.equal(task.cleanedUp, true);
  }
});

test('worker reports success only when both reports and photos have left the queue', async () => {
  for (const reports of [[], [{ syncStatus: 'sent', photo: { syncStatus: 'sent' } }]]) {
    const task = taskHarness({ reports });
    assert.equal(await task.execute(), 1);
    assert.equal(task.cleanedUp, true);
  }
  for (const reports of [[{ syncStatus: 'queued' }], [{ syncStatus: 'sent', photo: { syncStatus: 'queued' } }]]) {
    const task = taskHarness({ reports });
    assert.equal(await task.execute(), 2);
    assert.equal(task.cleanedUp, true);
  }
});

function triggersHarness(platform, initialState, configured = false) {
  const requests = [];
  let prepared = 0;
  const appState = {
    currentState: initialState,
    addEventListener: (_, listener) => {
      appState.change = listener;
      return { remove() {} };
    },
  };
  let network;
  let cleanup;
  const triggers = loadModule('useSyncTriggers.ts', {
    react: { useEffect: (effect) => { cleanup = effect(); } },
    'react-native': { AppState: appState, Platform: { OS: platform } },
    '@react-native-community/netinfo': {
      __esModule: true,
      default: { addEventListener: (listener) => { network = listener; return () => {}; } },
    },
    './backgroundSync': { registerBackgroundSync: async () => {} },
    '@/features/auth/guestSession': { ensureSession: async () => { prepared++; } },
    '@/features/auth/supabase': { supabaseConfigured: configured },
    './reportsStore': { reportsStore: { refresh: async () => {} } },
    './syncEngine': { requestSync: (options) => { requests.push(options); return Promise.resolve(); } },
  });
  triggers.useSyncTriggers();
  return {
    requests, appState, cleanup, get prepared() { return prepared; },
    network: (connected, reachable = connected) => network({ isConnected: connected, isInternetReachable: reachable }),
  };
}

test('Android reconnect sends in the background without waiting for the user to reopen the app', async () => {
  const hook = triggersHarness('android', 'active');
  try {
    // Let the initial queue refresh finish before observing only reconnect requests.
    await new Promise((resolve) => setImmediate(resolve));
    hook.requests.length = 0;
    hook.network(false);
    hook.appState.currentState = 'background';
    hook.appState.change('background');
    hook.network(true);
    assert.deepEqual(hook.requests, [{ ignoreBackoff: true, background: true }]);
    // Repeated connected notifications must not start another pass.
    hook.network(true);
    assert.equal(hook.requests.length, 1);
  } finally {
    hook.cleanup();
  }
});

test('iOS and web leave background reconnects to their supported execution mechanisms', async () => {
  for (const platform of ['ios', 'web']) {
    const hook = triggersHarness(platform, 'background');
    try {
      await new Promise((resolve) => setImmediate(resolve));
      hook.requests.length = 0;
      hook.network(false);
      hook.network(true);
      assert.equal(hook.requests.length, 0);
      hook.appState.currentState = 'active';
      hook.appState.change('active');
      assert.deepEqual(hook.requests, [{ ignoreBackoff: true }]);
    } finally {
      hook.cleanup();
    }
  }
});

test('foreground reconnect still sends immediately on every platform', async () => {
  for (const platform of ['android', 'ios', 'web']) {
    const hook = triggersHarness(platform, 'active');
    try {
      await new Promise((resolve) => setImmediate(resolve));
      hook.requests.length = 0;
      hook.network(false);
      hook.network(true);
      assert.deepEqual(hook.requests, [{ ignoreBackoff: true, background: false }]);
    } finally {
      hook.cleanup();
    }
  }
});

test('Android retries when a connected network finally regains internet access', async () => {
  const hook = triggersHarness('android', 'background');
  try {
    await new Promise((resolve) => setImmediate(resolve));
    hook.requests.length = 0;
    hook.network(false, false);
    hook.network(true, false);
    hook.network(true, true);
    assert.deepEqual(hook.requests, [
      { ignoreBackoff: true, background: true },
      { ignoreBackoff: true, background: true },
    ]);
  } finally {
    hook.cleanup();
  }
});

const tick = () => new Promise((resolve) => setImmediate(resolve));

function nativeHarness(session = { access_token: 'saved-token', user: { id: 'resident', is_anonymous: false } }) {
  const tasks = [];
  const files = [];
  class File {
    constructor(_, name) { this.name = name; files.push(this); }
    create() { this.exists = true; }
    write(body) { this.body = body; }
    delete() { this.exists = false; }
    createUploadTask(url, options) {
      let resolve, reject;
      const completion = new Promise((yes, no) => { resolve = yes; reject = no; });
      const task = {
        url, options, resolve, reject, released: false, started: false,
        uploadAsync() { this.started = true; return completion; },
        release() { this.released = true; },
      };
      tasks.push(task);
      return task;
    }
  }
  const native = loadModule('nativeReportUpload.ios.ts', {
    'expo-file-system': {
      Directory: class { create() {} }, File, Paths: { document: 'documents' },
      UploadType: { BINARY_CONTENT: 0 },
    },
    '@/features/auth/supabase': {
      supabaseConfigured: true,
      supabase: { auth: { getSession: async () => ({ data: { session }, error: null }) } },
    },
    './reportPayload': loadModule('reportPayload.ts', {}),
  }, { process: { env: {
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid/',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  } } });
  return { ...native, tasks, files };
}

test('iOS hands off several offline reports without waiting for connectivity or duplicating active uploads', async () => {
  const native = nativeHarness();
  let sent = 0;
  const handlers = { onSent: async () => { sent++; }, onFailed: async () => assert.fail('unexpected failure') };
  const first = report('first');
  Object.assign(first.submission, {
    latitude: 14.7, longitude: 121.1, locationAccuracy: 8,
    description: 'Test incident', incidentAt: '2026-10-14T00:00:00Z',
  });
  assert.equal(await native.enqueueNativeReport(first, handlers), true);
  assert.equal(await native.enqueueNativeReport(first, handlers), true);
  assert.equal(await native.enqueueNativeReport(report('second'), handlers), true);
  assert.equal(native.tasks.length, 2);
  assert.equal(sent, 0, 'native handoff must not claim server acceptance');
  assert.ok(native.tasks.every((task) => task.started && !task.released));
  assert.ok(native.files.every((file) => file.exists));
  const task = native.tasks[0];
  assert.equal(task.url, 'https://example.invalid/rest/v1/rpc/submit_report');
  assert.deepEqual(task.options, {
    httpMethod: 'POST', uploadType: 0, sessionType: 'background',
    headers: { apikey: 'public-key', Authorization: 'Bearer saved-token', 'Content-Type': 'application/json' },
  });
  assert.deepEqual(JSON.parse(native.files[0].body), {
    p_id: 'first', p_category: 'fire', p_latitude: 14.7, p_longitude: 121.1,
    p_location_accuracy: 8, p_description: 'Test incident',
    p_incident_at: '2026-10-14T00:00:00Z', p_created_at: '2026-10-14T00:00:00Z',
  });
  task.resolve({ status: 200 });
  native.tasks[1].resolve({ status: 200 });
  await tick();
  assert.equal(sent, 2);
  assert.ok(native.tasks.every((task) => task.released));
  assert.ok(native.files.every((file) => !file.exists));
});

test('iOS failures preserve retry semantics and release native resources', async () => {
  for (const failure of [401, 500, new Error('Network failure')]) {
    const native = nativeHarness();
    const failures = [];
    let sent = 0;
    const handlers = { onSent: async () => { sent++; }, onFailed: async (error) => failures.push(error) };
    await native.enqueueNativeReport(report('retry'), handlers);
    if (failure instanceof Error) native.tasks[0].reject(failure);
    else native.tasks[0].resolve({ status: failure });
    await tick();
    assert.equal(sent, 0, 'rejected report marked sent');
    assert.equal(failures.length, 1);
    assert.equal(native.tasks[0].released, true);
    assert.equal(native.files[0].exists, false);
    assert.equal(await native.enqueueNativeReport(report('retry'), handlers), true);
    assert.equal(native.tasks.length, 2, 'a failed task must not block later retries');
    native.tasks[1].resolve({ status: 200 });
    await tick();
  }
});

test('iOS requires a matching saved session, including guest ownership', async () => {
  const missing = nativeHarness(null);
  assert.equal(await missing.enqueueNativeReport(report('missing'), {}), false);
  assert.equal(missing.tasks.length, 0);
  const mismatch = nativeHarness();
  await assert.rejects(mismatch.enqueueNativeReport(report('private', 'fire', 'another-resident'), {}), /another account/);
  assert.equal(mismatch.tasks.length, 0);
  const guest = nativeHarness({ access_token: 'guest-token', user: { id: 'anonymous-id', is_anonymous: true } });
  let sent = false;
  await guest.enqueueNativeReport(report('guest', 'fire', null), {
    onSent: async () => { sent = true; }, onFailed: async () => assert.fail('guest failed'),
  });
  guest.tasks[0].resolve({ status: 200 });
  await tick();
  assert.equal(sent, true);
});

test('queue persists native acceptance and only then sends photos; native failures remain queued', async () => {
  const reports = [report('accepted'), report('rejected')];
  const callbacks = new Map();
  const engine = engineHarness(reports, async () => assert.fail('ordinary RPC used'), 'resident', async (item, handlers) => {
    if (!callbacks.has(item.submission.id)) callbacks.set(item.submission.id, handlers);
    return true;
  });
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.equal(callbacks.size, 2);
  assert.ok(reports.every((item) => item.syncStatus === 'queued'));
  assert.deepEqual(engine.events, []);
  await callbacks.get('rejected').onFailed(new Error('HTTP 401'));
  assert.equal(reports[1].syncStatus, 'queued');
  assert.equal(reports[1].attempts, 2);
  await callbacks.get('accepted').onSent();
  await tick();
  assert.equal(reports[0].syncStatus, 'sent');
  assert.ok(engine.events.includes('photo:accepted'));
  assert.ok(!engine.events.includes('photo:rejected'));
});

test('online startup prepares authentication for later offline reports', async () => {
  const hook = triggersHarness('ios', 'active', true);
  try {
    await tick();
    hook.network(true);
    await tick();
    assert.equal(hook.prepared, 1);
    hook.appState.currentState = 'background';
    hook.network(true);
    await tick();
    assert.equal(hook.prepared, 1, 'do not start guest sign-in while suspended');
  } finally { hook.cleanup(); }
});

test('concurrent startup and Send share guest creation; a failure permits a later retry', async () => {
  let creations = 0;
  let fail = true;
  const guest = loadModule('../auth/guestSession.ts', {
    './supabase': { supabaseConfigured: true, supabase: { auth: {
      getSession: async () => ({ data: { session: null } }),
      signInAnonymously: async () => {
        creations++;
        return fail ? { data: {}, error: new Error('Offline') } : { data: { session: { user: { id: 'guest' } } } };
      },
    } } },
  });
  const first = guest.ensureSession();
  const second = guest.ensureSession();
  assert.equal(first, second);
  await assert.rejects(first, /Offline/);
  assert.equal(creations, 1);
  fail = false;
  assert.equal((await guest.ensureSession()).user.id, 'guest');
  assert.equal(creations, 2);
});

test('an iOS upload waiting offline shows as waiting for signal, not as sending', async () => {
  const reports = [report('fire')];
  const engine = engineHarness(reports, async () => assert.fail('ordinary RPC used'), 'resident', async () => true, false);
  await engine.requestSync({ ignoreBackoff: true });
  assert.equal(engine.sending.size, 0);
  const online = engineHarness([report('fire')], undefined, 'resident', async () => true, true);
  await online.requestSync({ ignoreBackoff: true });
  assert.ok(online.sending.has('fire'), 'online, the upload is really in progress');
});

test('an expired session (401) retries once right away, then uses the normal delay', async () => {
  const reports = [report('fire')];
  const handlersById = [];
  const engine = engineHarness(reports, async () => assert.fail('ordinary RPC used'), 'resident', async (item, handlers) => {
    handlersById.push(handlers);
    return true;
  });
  await engine.requestSync({ background: true, ignoreBackoff: true });
  const expired = Object.assign(new Error('Report not accepted (HTTP 401)'), { status: 401 });
  await handlersById[0].onFailed(expired);
  assert.ok(reports[0].nextAttemptAt <= Date.now(), 'first 401 is due again immediately');
  await tick();
  assert.equal(handlersById.length, 2, 'the queue handed the report off again');
  await handlersById[1].onFailed(expired);
  assert.ok(reports[0].nextAttemptAt > Date.now(), 'a second 401 waits for the retry delay');
});

test('the reporting session is prepared once per launch, not on every network change', async () => {
  const hook = triggersHarness('ios', 'active', true);
  try {
    await tick();
    hook.network(true);
    hook.network(true, false);
    hook.network(true);
    await tick();
    assert.equal(hook.prepared, 1);
  } finally { hook.cleanup(); }
});

test('an SOS is sent before every other waiting report', async () => {
  const reports = [report('medical', 'medical'), report('sos', 'sos'), report('fire')];
  const engine = engineHarness(reports);
  await engine.requestSync({ background: true, ignoreBackoff: true });
  assert.deepEqual(engine.events.filter((event) => event.startsWith('text:')), ['text:sos', 'text:medical', 'text:fire']);
});

test('only an SOS sends the phone-lock answer, so other reports work before the SOS migration', () => {
  const { reportPayload } = loadModule('reportPayload.ts', {});
  const base = { id: 'r', category: 'fire', latitude: 1, longitude: 2, locationAccuracy: null, description: '', incidentAt: 'a', createdAt: 'b' };
  assert.equal('p_phone_lock_confirmed' in reportPayload(base), false);
  assert.equal(reportPayload({ ...base, category: 'sos', phoneLockConfirmed: true }).p_phone_lock_confirmed, true);
  assert.equal(reportPayload({ ...base, category: 'sos', phoneLockConfirmed: false }).p_phone_lock_confirmed, false);
});

test('the phone-owner check maps the lock prompt to confirmed, cancelled, or no lock', async () => {
  const check = (level, result) => loadModule('../sos/confirmOwner.ts', {
    'expo-local-authentication': {
      SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_STRONG: 3 },
      getEnrolledLevelAsync: async () => level,
      authenticateAsync: async (options) => {
        assert.equal(options.disableDeviceFallback, false, 'the phone PIN must stay allowed');
        return result;
      },
    },
  }).confirmPhoneOwner();
  assert.equal(await check(3, { success: true }), 'confirmed');
  assert.equal(await check(1, { success: true }), 'confirmed', 'a PIN-only phone still confirms');
  assert.equal(await check(3, { success: false, error: 'user_cancel' }), 'cancelled');
  assert.equal(await check(3, { success: false, error: 'lockout' }), 'cancelled');
  assert.equal(await check(0, { success: true }), 'noLock');
  assert.equal(await check(3, { success: false, error: 'passcode_not_set' }), 'noLock');
});
