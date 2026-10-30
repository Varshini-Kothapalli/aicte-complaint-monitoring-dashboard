/**
 * Dashboard, attention list, reports, user directory and duplicate review.
 * Requires MongoDB; uses its own *_test database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../src/models');
const app = require('../../src/app');
const { runImport } = require('../../src/import/importer');
const dup = require('../../src/services/duplicate.service');
const { connectFresh, disconnect } = require('../helpers/db');
const { REAL_DATA_DIR } = require('../helpers/fixtures');

let server;
let base;
const get = async (p) => {
  const res = await fetch(`${base}${p}`);
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch (e) { /* CSV */ }
  return { status: res.status, body, headers: res.headers };
};
const post = async (p, data) => {
  const res = await fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { status: res.status, body: await res.json() };
};

test.before(async () => {
  await connectFresh('monitoring');
  await runImport({ dataDir: REAL_DATA_DIR });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
test.after(async () => {
  await new Promise((r) => server.close(r));
  await disconnect();
});

test.describe('dashboard summary', () => {
  test('totals equal direct database counts and status groups add up', async () => {
    const { status, body } = await get('/dashboard/summary');
    assert.equal(status, 200);
    const t = body.data.totals;
    assert.equal(t.total, await M.Case.countDocuments());
    assert.equal(t.pending, await M.Case.countDocuments({ status: { $in: ['Received', 'Assigned'] } }));
    assert.equal(t.in_progress, await M.Case.countDocuments({ status: { $in: ['Under Process', 'Action Initiated'] } }));
    assert.equal(t.resolved, await M.Case.countDocuments({ status: 'Disposed' }));
    assert.equal(t.pending + t.in_progress + t.resolved, t.total);
    assert.equal(t.overdue, await M.Case.countDocuments({ is_overdue: true }));
    assert.equal(t.institutions, await M.Institution.countDocuments());
    assert.equal(t.possible_duplicates, null, 'no scan yet -> unknown, not 0');
    assert.equal(body.data.by_bureau.reduce((s, b) => s + b.total, 0), t.total);
    assert.equal(body.data.by_region.reduce((s, r) => s + r.count, 0), t.total);
    assert.equal(body.data.monthly.reduce((s, m) => s + m.received, 0), t.total);
    assert.equal(body.data.recent.length, 6);
  });
});

test.describe('attention list', () => {
  test('overdue section lists every overdue active complaint, longest overdue first', async () => {
    const { body } = await get('/attention?section=overdue&limit=100');
    assert.equal(body.meta.total, await M.Case.countDocuments({ is_overdue: true }));
    const days = body.data.map((c) => c.days_overdue);
    assert.deepEqual(days, [...days].sort((a, b) => b - a));
    const c = body.data[0];
    assert.ok(c.days_overdue > 21);
    assert.equal(c.recommended_escalation, 'Regional officer and senior management');
  });

  test('due-soon complaints are active, not overdue and due within the window', async () => {
    const { body } = await get('/attention?section=due_soon&days=7&limit=100');
    for (const c of body.data) {
      assert.equal(c.is_overdue, false);
      assert.ok(c.days_until_due >= 0 && c.days_until_due <= 7);
      assert.notEqual(c.status, 'Disposed');
    }
    assert.equal((await get('/attention?section=later')).status, 400);
  });
});

test.describe('reports', () => {
  test('all six reports build from data', async () => {
    const list = (await get('/reports')).body.data;
    assert.equal(list.length, 6);
    for (const r of list) {
      const { status, body } = await get(`/reports/${r.id}`);
      assert.equal(status, 200, r.id);
      assert.ok(Array.isArray(body.data.rows) && body.data.columns.length > 0, r.id);
    }
    const bureau = (await get('/reports/bureau')).body.data;
    assert.equal(bureau.rows.reduce((s, r) => s + r.total, 0), await M.Case.countDocuments());
    const overdue = (await get('/reports/overdue')).body.data;
    assert.equal(overdue.rows.length, await M.Case.countDocuments({ is_overdue: true }));
    assert.ok(overdue.rows.every((r) => !r.case.startsWith('SYN-')));
    const transfers = (await get('/reports/transfers')).body.data;
    assert.equal(transfers.rows.length, await M.Transfer.countDocuments());
  });

  test('date range filters case-based reports', async () => {
    const r = (await get('/reports/status?from=2026-09-01&to=2026-09-30')).body.data;
    const total = r.rows.find((x) => x.status === 'All complaints').total;
    assert.equal(total, await M.Case.countDocuments({ receipt_date: { $gte: new Date('2026-09-01'), $lt: new Date('2026-10-01') } }));
  });

  test('CSV export has a header row and one line per row', async () => {
    const { status, body, headers } = await get('/reports/bureau?format=csv');
    assert.equal(status, 200);
    assert.match(headers.get('content-type'), /text\/csv/);
    const lines = body.replace(/^﻿/, '').trim().split(/\r\n/);
    assert.equal(lines[0].split(',')[0], 'Bureau / Cell');
    assert.equal(lines.length, 4);
  });

  test('unknown report returns 404', async () => {
    assert.equal((await get('/reports/salaries')).status, 404);
  });
});

test.describe('user directory', () => {
  test('returns display names without e-mail or credentials', async () => {
    const { body } = await get('/users');
    assert.equal(body.data.length, await M.User.countDocuments());
    for (const u of body.data) {
      assert.ok(u.name && !('email' in u) && !('password_hash' in u));
      assert.equal(u.fictional, true);
    }
  });
});

test.describe('duplicate review', () => {
  let report;
  test.before(async () => { report = await dup.scanDuplicates(); });

  test('scan stores only cross-Bureau pairs of active, verified complaints at one institution', async () => {
    assert.ok(report.flagged > 0);
    const pairs = await M.OverlapCandidate.find({}).lean();
    for (const p of pairs) {
      const [a, b] = await Promise.all([M.Case.findOne({ case_id: p.case_a }).lean(), M.Case.findOne({ case_id: p.case_b }).lean()]);
      assert.equal(a.institution_id, b.institution_id);
      assert.equal(a.institution_id, p.institution_id);
      assert.notEqual(a.bureau, b.bureau);
      assert.notEqual(a.status, 'Disposed');
      assert.notEqual(b.status, 'Disposed');
      assert.equal(a.identity_status, 'VERIFIED');
      assert.ok(['HIGH', 'MEDIUM'].includes(p.band));
      assert.ok(p.reasons.length > 0);
      assert.equal(p.provenance, 'DERIVED');
    }
  });

  test('the scripted demo pair is flagged and the unrelated lab case is not', async () => {
    assert.ok(await M.OverlapCandidate.findOne({ pair_key: 'SYN-PGRC-2026-0001:SYN-RB-2026-0002' }));
    assert.equal(await M.OverlapCandidate.countDocuments({ pair_key: { $in: ['SYN-AB-2026-0003:SYN-PGRC-2026-0001', 'SYN-AB-2026-0003:SYN-RB-2026-0002'] } }), 0);
  });

  test('re-scanning is idempotent and the scan never changes a complaint', async () => {
    const before = await M.Case.find({}).sort({ case_id: 1 }).lean();
    const again = await dup.scanDuplicates();
    assert.equal(again.inserted, 0);
    assert.equal(again.updated, 0);
    assert.equal(again.unchanged, report.flagged);
    const after = await M.Case.find({}).sort({ case_id: 1 }).lean();
    assert.deepEqual(after, before);
  });

  test('dashboard shows the pending duplicate count after a scan', async () => {
    const { body } = await get('/dashboard/summary');
    assert.equal(body.data.totals.possible_duplicates, await M.OverlapCandidate.countDocuments({ official_decision: 'pending', alert_active: true }));
  });

  test('decision validation and permissions', async () => {
    const key = 'SYN-PGRC-2026-0001:SYN-RB-2026-0002';
    assert.equal((await post(`/duplicates/${key}/decision`, { decision: 'merge', reviewer_id: 'SYN-USR-PGRC-H', note: 'x' })).status, 400);
    assert.equal((await post(`/duplicates/${key}/decision`, { decision: 'confirmed_linked', reviewer_id: 'SYN-USR-ADMIN-01', note: 'Same refund matter' })).status, 403);
    assert.equal((await post(`/duplicates/${key}/decision`, { decision: 'confirmed_linked', reviewer_id: 'SYN-USR-AB-H', note: 'Same refund matter' })).status, 403);
    assert.equal((await post(`/duplicates/${key}/decision`, { decision: 'confirmed_linked', reviewer_id: 'SYN-USR-NOBODY', note: 'Same refund matter' })).status, 400);
    assert.equal((await post('/duplicates/SYN-PGRC-2026-0001:SYN-PGRC-2026-0002/decision', { decision: 'confirmed_linked', reviewer_id: 'SYN-USR-PGRC-H', note: 'Same matter' })).status, 404);
  });

  test('a decision is recorded once, audited, added to both histories, and changes nothing else', async () => {
    const key = 'SYN-PGRC-2026-0001:SYN-RB-2026-0002';
    const casesBefore = await M.Case.find({ case_id: { $in: ['SYN-PGRC-2026-0001', 'SYN-RB-2026-0002'] } }).lean();
    const { status, body } = await post(`/duplicates/${key}/decision`, { decision: 'confirmed_linked', reviewer_id: 'SYN-USR-PGRC-H', note: 'Same fee refund matter; RB to lead.' });
    assert.equal(status, 200);
    assert.equal(body.data.official_decision, 'confirmed_linked');
    assert.equal(body.data.decided_by_display.name, 'Priya Nair');

    const again = await post(`/duplicates/${key}/decision`, { decision: 'dismissed_unrelated', reviewer_id: 'SYN-USR-RB-H', note: 'Second opinion' });
    assert.equal(again.status, 409);

    const audit = await M.AuditLog.find({ entity_id: key }).lean();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actor, 'SYN-USR-PGRC-H');
    assert.equal(audit[0].before_state.official_decision, 'pending');
    assert.equal(audit[0].after_state.official_decision, 'confirmed_linked');
    assert.equal(await M.CaseAction.countDocuments({ action_type: 'coordination', case_id: { $in: ['SYN-PGRC-2026-0001', 'SYN-RB-2026-0002'] } }), 2);

    const casesAfter = await M.Case.find({ case_id: { $in: ['SYN-PGRC-2026-0001', 'SYN-RB-2026-0002'] } }).lean();
    assert.deepEqual(casesAfter, casesBefore, 'status, Bureau, officer and dates are unchanged');

    const rescan = await dup.scanDuplicates();
    assert.equal(rescan.kept_decided, 1);
    assert.equal((await M.OverlapCandidate.findOne({ pair_key: key }).lean()).official_decision, 'confirmed_linked');

    const detail = (await get('/cases/SYN-PGRC-2026-0001')).body.data;
    assert.ok(detail.actions.some((a) => a.action_type === 'coordination' && /RB\/2026\/0002/.test(a.remarks)));
  });
});
