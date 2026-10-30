/**
 * API tests against a freshly imported *_test database. Requires a running MongoDB.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../src/models');
const app = require('../../src/app');
const { runImport } = require('../../src/import/importer');
const { connectFresh, disconnect } = require('../helpers/db');
const { REAL_DATA_DIR } = require('../helpers/fixtures');

let server;
let base;

const get = async (p) => {
  const res = await fetch(`${base}${p}`);
  return { status: res.status, body: await res.json() };
};

test.before(async () => {
  await connectFresh('api');
  await runImport({ dataDir: REAL_DATA_DIR });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  await new Promise((r) => server.close(r));
  await disconnect();
});

test.describe('GET /cases', () => {
  test('returns the success envelope with pagination meta', async () => {
    const { status, body } = await get('/cases?limit=5');
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 5);
    assert.equal(body.meta.total, await M.Case.countDocuments());
    assert.equal(body.meta.totalPages, Math.ceil(body.meta.total / 5));
    assert.deepEqual(body.meta.provenance, { SYNTHETIC: body.meta.total });
    assert.equal(body.meta.overdue.basis, 'dataset_snapshot');
  });

  test('pages do not overlap and together cover all matching cases', async () => {
    const seen = new Set();
    const total = await M.Case.countDocuments({ bureau: 'RB' });
    for (let page = 1; page <= Math.ceil(total / 100); page += 1) {
      const { body } = await get(`/cases?bureau=RB&limit=100&page=${page}`);
      body.data.forEach((c) => seen.add(c.case_id));
    }
    assert.equal(seen.size, total);
  });

  test('filters match direct database counts', async () => {
    const checks = [
      ['bureau=PGRC', { bureau: 'PGRC' }],
      ['status=Disposed', { status: 'Disposed' }],
      ['status=Received,Assigned', { status: { $in: ['Received', 'Assigned'] } }],
      ['is_overdue=true', { is_overdue: true }],
      ['region=West&bureau=RB', { region: 'West', bureau: 'RB' }],
      ['category=fee_refund', { category: 'fee_refund' }],
      ['identity_status=UNRESOLVED,VERIFICATION_QUEUE', { identity_status: { $in: ['UNRESOLVED', 'VERIFICATION_QUEUE'] } }],
      ['institution_id=SYN-INST-0001', { institution_id: 'SYN-INST-0001' }],
      ['from=2026-09-01&to=2026-09-30', { receipt_date: { $gte: new Date('2026-09-01'), $lt: new Date('2026-10-01') } }],
    ];
    for (const [qs, filter] of checks) {
      const { body } = await get(`/cases?${qs}&limit=1`);
      assert.equal(body.meta.total, await M.Case.countDocuments(filter), qs);
    }
  });

  test('AICTE permanent ID filter resolves to the institution', async () => {
    const inst = await M.Institution.findOne({ institution_id: 'SYN-INST-0001' }).lean();
    const { body } = await get(`/cases?aicte_permanent_id=${inst.aicte_permanent_id}&limit=100`);
    assert.ok(body.meta.total > 0);
    assert.ok(body.data.every((c) => c.institution_id === 'SYN-INST-0001'));
    const none = await get('/cases?aicte_permanent_id=SYN-1-000000');
    assert.equal(none.body.meta.total, 0);
  });

  test('free-text search covers case ID, text and institution name', async () => {
    const byId = await get('/cases?q=SYN-RB-2026-0002');
    assert.deepEqual(byId.body.data.map((c) => c.case_id), ['SYN-RB-2026-0002']);
    const byInst = await get('/cases?q=ABC%20Engineering&limit=100');
    assert.equal(byInst.body.meta.total, await M.Case.countDocuments({ institution_id: 'SYN-INST-0001' }));
    const regexChars = await get('/cases?q=' + encodeURIComponent('.*('));
    assert.equal(regexChars.status, 200);
    assert.equal(regexChars.body.meta.total, 0);
  });

  test('each case carries its institution summary and provenance, and no internal fields', async () => {
    const { body } = await get('/cases?institution_id=SYN-INST-0001&limit=100');
    for (const c of body.data) {
      assert.equal(c.institution.name, 'ABC Engineering College');
      assert.equal(c.provenance, 'SYNTHETIC');
      for (const k of ['complainant_ref', 'complainant_hash', 'matter_id', 'design_note', 'import_meta', '_id']) assert.ok(!(k in c), k);
    }
  });

  test('invalid parameters return 400 with details', async () => {
    const { status, body } = await get('/cases?limit=1000&bureau=XX&status=Closed&from=2026-09-30&to=2026-09-01&sort=password');
    assert.equal(status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.details.length, 5);
  });
});

test.describe('GET /cases/:caseId', () => {
  test('returns case detail with institution, officer, chronological actions and transfers', async () => {
    const { status, body } = await get('/cases/SYN-PGRC-2026-0001');
    assert.equal(status, 200);
    const c = body.data;
    assert.equal(c.case_id, 'SYN-PGRC-2026-0001');
    assert.equal(c.institution.institution_id, 'SYN-INST-0001');
    assert.equal(c.assigned_officer_info.user_id, c.assigned_officer);
    assert.equal(c.bureau_info.code, 'PGRC');
    assert.equal(c.actions.length, await M.CaseAction.countDocuments({ case_id: 'SYN-PGRC-2026-0001' }));
    const ts = c.actions.map((a) => Date.parse(a.ts));
    assert.deepEqual(ts, [...ts].sort((a, b) => a - b));
    assert.equal(c.actions[0].action_type, 'created');
    for (const k of ['matter_id', 'design_note', 'complainant_ref', 'complainant_hash']) assert.ok(!(k in c), k);
  });

  test('a transferred case lists its transfers', async () => {
    const t = await M.Transfer.findOne({}).lean();
    const { body } = await get(`/cases/${t.case_id}`);
    assert.ok(body.data.transfers.length >= 1);
    assert.equal(body.data.was_transferred, true);
  });

  test('unknown and malformed IDs return 404 and 400', async () => {
    assert.equal((await get('/cases/SYN-PGRC-2026-9999')).status, 404);
    assert.equal((await get('/cases/SYN-PGRC-2026-9999')).body.error.code, 'CASE_NOT_FOUND');
    assert.equal((await get('/cases/' + encodeURIComponent('$where'))).status, 400);
  });
});

test.describe('GET /institutions', () => {
  test('lists institutions with derived case summaries', async () => {
    const { status, body } = await get('/institutions?limit=100');
    assert.equal(status, 200);
    assert.equal(body.meta.total, await M.Institution.countDocuments());
    const abc = body.data.find((i) => i.institution_id === 'SYN-INST-0001');
    assert.equal(abc.case_summary.total_cases, await M.Case.countDocuments({ institution_id: 'SYN-INST-0001' }));
    assert.equal(abc.case_summary.provenance, 'DERIVED');
    assert.equal(abc.provenance, 'SYNTHETIC');
  });

  test('search and filters work, and same-name institutions are flagged', async () => {
    const { body } = await get('/institutions?q=PQR');
    assert.deepEqual(body.data.map((i) => i.district).sort(), ['Belagavi', 'Pune']);
    assert.ok(body.data.every((i) => i.shares_name_with === 1));
    const west = await get('/institutions?region=West&limit=100');
    assert.equal(west.body.meta.total, await M.Institution.countDocuments({ region: 'West' }));
    assert.equal((await get('/institutions?stream=Medicine')).status, 400);
  });
});

test.describe('GET /institutions/:institutionId', () => {
  test('consolidates all of an institution\'s cases across Bureaus', async () => {
    const { status, body } = await get('/institutions/SYN-INST-0001');
    assert.equal(status, 200);
    const d = body.data;
    assert.equal(d.cases.length, await M.Case.countDocuments({ institution_id: 'SYN-INST-0001' }));
    const total = d.case_summary.by_bureau.reduce((s, b) => s + b.total, 0);
    assert.equal(total, d.cases.length);
    // The scripted demo: active PGRC, RB and AB cases at ABC Engineering College.
    assert.deepEqual(d.case_summary.active_bureaus, ['AB', 'PGRC', 'RB']);
    assert.equal(d.case_summary.multiple_bureaus_active, true);
    for (const id of ['SYN-PGRC-2026-0001', 'SYN-RB-2026-0002', 'SYN-AB-2026-0003']) assert.ok(d.cases.some((c) => c.case_id === id), id);
  });

  test('lists other institutions with the same name', async () => {
    const { body } = await get('/institutions/SYN-INST-0016');
    assert.deepEqual(body.data.same_name_institutions.map((i) => i.district), ['Belagavi']);
  });

  test('unknown institution returns 404', async () => {
    const { status, body } = await get('/institutions/SYN-INST-9999');
    assert.equal(status, 404);
    assert.equal(body.error.code, 'INSTITUTION_NOT_FOUND');
  });
});
