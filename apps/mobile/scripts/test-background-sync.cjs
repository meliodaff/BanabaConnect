const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Exercise the actual TS modules with native APIs replaced; no phone or network is needed.
function loadModule(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/queue', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function('require', 'module', 'exports', outputText)(requireMock, module, module.exports);
  return module.exports;
}

function report(id, category = 'fire', ownerId = 'resident') {
  return {
    submission: { id, category, createdAt: '2026-10-14T00:00:00Z' },
    ownerId, syncStatus: 'queued', attempts: 1, nextAttemptAt: Date.now() + 600_000,
    photo: { uri: `file://${id}.jpg`, syncStatus: 'queued', attempts: 0 },
  };
}

function engineHarness(reports, send = async () => {}, owner = 'resident') {
  const events = [];
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
      setSending: () => events.push('ui'), refresh: async () => events.push('ui'),
    } },
    './statusSync': { refreshStatuses: async () => events.push('status') },
    './syncFeedback': { notifyReportSent: () => events.push('toast') },
    './transport': { OfflineError, transport: {
      sendReport: async (submission) => {
        events.push(`text:${submission.id}`);
        await send(submission, OfflineError);
      },
      uploadPhoto: async (id) => events.push(`photo:${id}`),
    } },
  });
  return { ...engine, events };
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
