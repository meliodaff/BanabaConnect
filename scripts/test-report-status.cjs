const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

// Run the actual TS logic without starting Next.js, native modules, or a live database.
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
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

const shared = load('packages/shared/src/report.ts');
const labels = load('apps/web/lib/labels.ts', { '@banabaconnect/shared': shared });
const icons = { next: 'arrow', pending: 'hourglass', sent: 'sent', sending: 'sending', queued: 'clock', check: 'check', closed: 'closed' };
const delivery = load('apps/mobile/src/features/queue/deliveryStatus.ts', {
  '@banabaconnect/shared': shared,
  '@/components/Icon': { icons },
});

function report(status, overrides = {}) {
  return {
    submission: { id: 'report-1', createdAt: '2026-10-15T00:00:00Z' },
    syncStatus: 'sent', serverStatus: status, serverStatusAt: null, serverNote: null,
    sentAt: '2026-10-15T00:01:00Z', lastError: null, ...overrides,
  };
}

test('only an explicit dispatch update tells the resident responders are on the way', () => {
  const dispatched = delivery.deliveryStatusOf(report('dispatched'), false, {});
  assert.equal(dispatched.label, 'Papunta na ang responders');
  assert.equal(dispatched.icon, icons.next);
  assert.match(delivery.deliveryStatusDetail(report('dispatched')), /Manatili sa ligtas na lugar/);
  assert.equal(delivery.deliveryStatusOf(report('received'), false, {}).label, 'Natanggap na ng barangay');
  assert.equal(delivery.deliveryStatusOf(report('in_progress'), false, {}).label, 'Inaasikaso na ang report');
  for (const status of ['received', 'in_progress', 'resolved', 'invalid']) {
    assert.doesNotMatch(delivery.deliveryStatusDetail(report(status)), /Papunta na/);
  }
});

test('local sending and offline states take precedence over a cached barangay status', () => {
  assert.equal(delivery.deliveryStatusOf(report('dispatched'), true, {}).label, 'Ipinapadala…');
  assert.equal(delivery.deliveryStatusOf(report('dispatched', { syncStatus: 'queued' }), false, {}).label, 'Naghihintay ng signal');
  assert.doesNotMatch(delivery.deliveryStatusDetail(report('dispatched', { syncStatus: 'queued' })), /Papunta na/);
  assert.match(delivery.deliveryStatusDetail(report('invalid', { serverNote: 'Duplicate report' })), /mensahe ng barangay sa ibaba/);
});

test('a status from a newer dashboard shows as an update instead of a stale status', () => {
  const newer = report('unrecognized');
  assert.equal(delivery.deliveryStatusOf(newer, false, {}).label, 'May update ang barangay');
  assert.match(delivery.deliveryStatusDetail(newer), /I-update ang BanabaConnect/);
  const types = load('apps/mobile/src/features/queue/types.ts', { '@banabaconnect/shared': shared });
  assert.equal(types.toResidentStatus('dispatched'), 'dispatched');
  assert.equal(types.toResidentStatus('on_hold'), 'unrecognized');
  assert.equal(types.toResidentStatus(null), null);
});

test('the resident notification says exactly what the app and the staff preview show', () => {
  // The latest migration that defines update_report_status is what the database runs.
  const dir = path.join(root, 'supabase/migrations');
  const latest = fs.readdirSync(dir).sort().reverse()
    .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'))
    .find((sql) => /create or replace function public\.update_report_status/.test(sql));
  const cases = (variable) => {
    const block = latest.match(new RegExp(`${variable} := case p_status([\\s\\S]*?)end;`))[1];
    return Object.fromEntries([...block.matchAll(/when '(\w+)' then '((?:[^']|'')*)'/g)]
      .map(([, status, text]) => [status, text.replace(/''/g, "'")]));
  };
  assert.deepEqual(cases('v_title'), shared.REPORT_STATUS_LABELS);
  assert.deepEqual(cases('v_body'), shared.REPORT_STATUS_DETAILS);
});

test('status refresh accepts dispatch and preserves the current staff note', async () => {
  let saved;
  let requestedIds;
  let refreshed = false;
  const statusSync = load('apps/mobile/src/features/queue/statusSync.ts', {
    '@banabaconnect/shared': shared,
    '@/features/auth/guestSession': { currentReportOwner: async () => 'resident-1' },
    '@/features/auth/supabase': {
      supabaseConfigured: true,
      supabase: {
        auth: { getSession: async () => ({ data: { session: { user: { id: 'resident-1' } } } }) },
        from: () => ({ select: () => ({ in: async (_column, ids) => {
          requestedIds = ids;
          return { error: null, data: [{ id: 'report-1', status: 'dispatched', status_updated_at: '2026-10-15T01:00:00Z', history: [
            { to_status: 'received', changed_at: '2026-10-15T00:00:00Z', note: 'Earlier note' },
            { to_status: 'dispatched', changed_at: '2026-10-15T01:00:00Z', note: 'Team 2 is on the way' },
          ] }] };
        } }) }),
      },
    },
    './reportRepository': {
      listReports: async (owner) => {
        assert.equal(owner, 'resident-1');
        return [report('received'), report(null, { submission: { id: 'offline' }, syncStatus: 'queued' })];
      },
      saveServerStatuses: async (statuses) => { saved = statuses; },
    },
    './reportsStore': { reportsStore: { refresh: async () => { refreshed = true; } } },
  });
  await statusSync.refreshStatuses({ force: true });
  assert.deepEqual(requestedIds, ['report-1']);
  assert.equal(saved[0].status, 'dispatched');
  assert.equal(saved[0].note, 'Team 2 is on the way');
  assert.equal(refreshed, true);
});

test('dispatch stays in the active queue and monthly open-report totals', () => {
  const monthly = load('apps/web/lib/monthlyReport.ts', {
    '@banabaconnect/shared': shared, '@/lib/labels': labels,
  });
  const reports = ['received', 'dispatched', 'in_progress', 'resolved', 'invalid'].map((status) => ({
    status, category: 'fire', priority: 0.7, reporter: null, outsideBanabaM: null,
    receivedAt: '2026-10-15T00:00:00Z', statusUpdatedAt: '2026-10-15T00:10:00Z',
    firstActionAt: status === 'dispatched' ? '2026-10-15T00:02:00Z' : null,
  }));
  const summary = monthly.summarizeMonth(reports);
  assert.ok(labels.STATUS_FILTERS.active.statuses.includes('dispatched'));
  assert.equal(summary.total, 5);
  assert.equal(summary.open, 3);
  assert.equal(summary.byType[0].open, 3);
  assert.equal(summary.byStatus.dispatched, 1);
  assert.equal(summary.toFirstAction.medianMs, 120000);
  assert.equal(summary.toResolved.count, 1);
});

test('dashboard counts include dispatched reports without counting them as untouched', async () => {
  const totals = { received: 2, dispatched: 3, in_progress: 4, resolved: 5, invalid: 1 };
  const data = load('apps/web/lib/data.ts', {
    '@banabaconnect/shared': shared,
    '@/lib/labels': labels,
    '@/lib/pagination': { PAGE_SIZE: 25, pageCount: (count) => Math.ceil(count / 25) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => {
      const filters = {};
      const query = {
        select: () => query,
        eq: (key, value) => { filters[key] = value; return query; },
        gte: (key) => { filters[key] = true; return query; },
        then: (resolve, reject) => Promise.resolve({ error: null, count: filters.priority_score ? 1 : (totals[filters.status] ?? 0) }).then(resolve, reject),
      };
      return query;
    } }) },
  });
  const counts = await data.countReportsByStatus('2026-10-15T00:00:00Z');
  assert.equal(counts.byStatus.dispatched, 3);
  assert.equal(data.countWithStatus(counts, labels.STATUS_FILTERS.active.statuses), 9);
  assert.equal(counts.urgentWaiting, 1);
});

test('"Reports today" filters the list and every status count by arrival since midnight', async () => {
  const queries = [];
  const data = load('apps/web/lib/data.ts', {
    '@banabaconnect/shared': shared,
    '@/lib/labels': labels,
    '@/lib/pagination': { PAGE_SIZE: 25, pageCount: (count) => Math.ceil(count / 25) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => {
      const gte = {};
      queries.push(gte);
      const query = {
        select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query,
        gte: (key, value) => { gte[key] = value; return query; },
        then: (resolve, reject) => Promise.resolve({ error: null, count: 0, data: [] }).then(resolve, reject),
      };
      return query;
    } }) },
  });
  const midnight = '2026-10-17T16:00:00.000Z';
  await data.listReports(['received'], { receivedSince: midnight });
  await data.countReportsByStatus(midnight, midnight);
  assert.ok(queries.length > 1);
  assert.ok(queries.every((gte) => gte.received_at === midnight), 'list and every card count use the same day');
  queries.length = 0;
  await data.listReports(['received']);
  await data.countReportsByStatus(midnight);
  assert.ok(queries.every((gte) => gte.received_at === undefined), 'without the filter, all dates are listed');
  assert.equal(labels.parseDateFilter('today'), 'today');
  assert.equal(labels.parseDateFilter('yesterday'), null);
  assert.equal(labels.dateQuery('today'), '&date=today');
  assert.equal(labels.dateQuery(null), '');
});

test('the Overview urgent and being-handled views use the same rules as their numbers', async () => {
  const queries = [];
  const data = load('apps/web/lib/data.ts', {
    '@banabaconnect/shared': shared,
    '@/lib/labels': labels,
    '@/lib/pagination': { PAGE_SIZE: 25, pageCount: (count) => Math.ceil(count / 25) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => {
      const filters = {};
      queries.push(filters);
      const query = {
        select: () => query, order: () => query, limit: () => query,
        in: (key, values) => { filters[key] = values; return query; },
        gte: (key, value) => { filters[key] = value; return query; },
        then: (resolve, reject) => Promise.resolve({ error: null, data: [] }).then(resolve, reject),
      };
      return query;
    } }) },
  });
  const { urgent, handling } = labels.ONLY_FILTERS;
  await data.listReports(urgent.statuses, { minPriority: urgent.minPriority });
  await data.listReports(handling.statuses, { minPriority: handling.minPriority });
  // Urgent: Critical or High (the Overview's priorityBand), still Received.
  assert.deepEqual(queries[0], { status: ['received'], priority_score: labels.HIGH_PRIORITY_MIN });
  assert.equal(labels.priorityBand(labels.HIGH_PRIORITY_MIN), 'high');
  assert.deepEqual(queries[1], { status: ['dispatched', 'in_progress'] });
  assert.equal(labels.parseOnlyFilter('urgent'), 'urgent');
  assert.equal(labels.parseOnlyFilter('everything'), null);
  assert.equal(labels.filtersQuery({ only: 'urgent', date: 'today' }), '&only=urgent&date=today');
  assert.equal(labels.filtersQuery({ only: null, date: null }), '');
});

test('employee action saves dispatch and rejects invalid or unsupported updates before calling the database', async () => {
  const calls = [];
  let refreshes = 0;
  const actions = load('apps/web/app/(dashboard)/actions.ts', {
    '@banabaconnect/shared': shared,
    'next/cache': { refresh: () => { refreshes++; } },
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/i18n-server': { getDictionary: async () => ({ actions: { chooseStatus: 'Choose a status.', invalidNeedsNote: 'A reason is required.' } }) },
    '@/lib/supabase/server': { createClient: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; } }) },
  });
  const update = async (status, note = '') => {
    const form = new FormData();
    form.set('reportId', 'report-1'); form.set('status', status); form.set('note', note);
    return actions.updateReportStatus({ error: null, done: false }, form);
  };
  assert.equal((await update('dispatched', ' Team 2 ')).done, true);
  assert.deepEqual(calls[0], { name: 'update_report_status', args: { p_report_id: 'report-1', p_status: 'dispatched', p_note: 'Team 2' } });
  assert.equal(refreshes, 1);
  assert.equal((await update('invented')).done, false);
  assert.equal((await update('invalid')).done, false);
  assert.equal(calls.length, 1);
});

test('SOS has its own screen: it is a category, but not one residents pick in the report form', () => {
  assert.ok(shared.REPORT_CATEGORIES.includes('sos'));
  assert.equal(shared.PICKER_CATEGORIES.includes('sos'), false);
  assert.equal(shared.PICKER_CATEGORIES.length, shared.REPORT_CATEGORIES.length - 1);
});

test('the database keeps every SOS Critical and accepts apps that do not send the phone-lock answer', () => {
  const dir = path.join(root, 'supabase/migrations');
  const files = fs.readdirSync(dir).sort().map((file) => fs.readFileSync(path.join(dir, file), 'utf8'));
  // The latest definition of each function is the one the database runs.
  const latest = (name) => [...files].reverse().find((sql) => new RegExp(`create (or replace )?function public\\.${name}\\(`).test(sql));
  const body = (name) => {
    const sql = latest(name);
    const start = sql.search(new RegExp(`create (or replace )?function public\\.${name}\\(`));
    return sql.slice(start, sql.indexOf('$$;', start));
  };
  for (const name of ['rescore_cluster_volume', 'review_verification']) {
    assert.match(body(name), /priority_score = case when r\.category = 'sos' then 1\.000 else/, name);
  }
  assert.match(body('submit_report'), /p_phone_lock_confirmed boolean default null/);
});
