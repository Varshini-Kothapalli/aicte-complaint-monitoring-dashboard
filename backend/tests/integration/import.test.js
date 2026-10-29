/**
 * Integration tests for the importer. Requires a running MongoDB (MONGODB_URI_TEST, default
 * mongodb://127.0.0.1:27017/aicte_complaints_test). Each test uses its own *_test database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const M = require('../../src/models');
const { runImport } = require('../../src/import/importer');
const { connectFresh, disconnect } = require('../helpers/db');
const { REAL_DATA_DIR, copyFixtures, readRows, writeRows, countRows } = require('../helpers/fixtures');

const FILES = {
  bureaus: 'bureaus.csv', institutions: 'institutions.csv', users: 'users.csv', category_matrix: 'category_matrix.csv',
  inst_aliases: 'institution_alias_tests.csv', cases: 'cases.csv', case_actions: 'case_actions.csv',
  transfers: 'transfers.csv', overlap_ground_truth: 'overlap_ground_truth.csv',
};
const MODEL_BY_NAME = {
  bureaus: M.Bureau, institutions: M.Institution, users: M.User, category_matrix: M.CategoryMatrix, inst_aliases: M.InstAlias,
  cases: M.Case, case_actions: M.CaseAction, transfers: M.Transfer, overlap_ground_truth: M.OverlapGroundTruth,
};
const EXACT_DUPLICATE_ACTION_ROWS = 5; // verified in case_actions.csv; kept once each

test.describe('import of the real fixture files', () => {
  let first;
  test.before(async () => {
    await connectFresh('import_real');
    first = await runImport({ dataDir: REAL_DATA_DIR });
  });
  test.after(disconnect);

  test('every row is accounted for and nothing is rejected', () => {
    assert.equal(first.rejections.length, 0, JSON.stringify(first.rejections.slice(0, 3)));
    for (const [name, file] of Object.entries(FILES)) {
      const c = first.summary[name];
      assert.equal(c.read, countRows(file), `${name} read count`);
      assert.equal(c.inserted + c.skipped + c.rejected + c.updated + c.unchanged, c.read, `${name} totals`);
    }
    assert.equal(first.summary.case_actions.skipped, EXACT_DUPLICATE_ACTION_ROWS);
  });

  test('database counts equal source rows (minus exact duplicate rows)', async () => {
    for (const [name, file] of Object.entries(FILES)) {
      const expected = countRows(file) - (name === 'case_actions' ? EXACT_DUPLICATE_ACTION_ROWS : 0);
      assert.equal(await MODEL_BY_NAME[name].countDocuments(), expected, name);
    }
    assert.equal(await M.Case.countDocuments({ is_overdue: true }), readRows(REAL_DATA_DIR, 'cases.csv').filter((r) => r.is_overdue === 'True').length);
  });

  test('the users.csv collision is resolved by the documented transformation', async () => {
    assert.deepEqual(first.transformations.map((t) => t.key), ['SYN-USR-REG-NE']);
    const ne = await M.User.findOne({ user_id: 'SYN-USR-REG-NE' }).select('+import_meta').lean();
    assert.equal(ne.email, 'reg-ne@demo.invalid');
    assert.equal(ne.region, 'North-East');
    assert.equal(ne.source_user_id, 'SYN-USR-REG-NORTHE');
    assert.deepEqual(ne.import_meta.transformations, ['T1-users-regional-id-collision']);
    const northern = await M.User.findOne({ user_id: 'SYN-USR-REG-NORTHE' }).lean();
    assert.equal(northern.region, 'Northern');
  });

  test('a second run is idempotent: nothing inserted or updated', async () => {
    const before = await M.Case.findOne({ case_id: 'SYN-PGRC-2026-0001' }).lean();
    const second = await runImport({ dataDir: REAL_DATA_DIR });
    for (const [name, c] of Object.entries(second.summary)) {
      assert.equal(c.inserted, 0, `${name} inserted`);
      assert.equal(c.updated, 0, `${name} updated`);
      assert.equal(c.rejected, 0, `${name} rejected`);
    }
    const after = await M.Case.findOne({ case_id: 'SYN-PGRC-2026-0001' }).lean();
    assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
    assert.equal(await M.ImportBatch.countDocuments(), 2);
  });

  test('referential integrity: no orphaned references', async () => {
    const orphans = async (model, localField, from, foreignField, match = {}) => {
      const rows = await model.aggregate([
        { $match: { [localField]: { $nin: [null, ''] }, ...match } },
        { $lookup: { from, localField, foreignField, as: 'ref' } },
        { $match: { ref: { $size: 0 } } },
        { $count: 'n' },
      ]);
      return rows.length ? rows[0].n : 0;
    };
    assert.equal(await orphans(M.Case, 'institution_id', 'institutions', 'institution_id'), 0);
    assert.equal(await orphans(M.Case, 'assigned_officer', 'users', 'user_id'), 0);
    assert.equal(await orphans(M.Case, 'bureau', 'bureaus', 'code'), 0);
    assert.equal(await orphans(M.CaseAction, 'case_id', 'cases', 'case_id'), 0);
    assert.equal(await orphans(M.CaseAction, 'actor', 'users', 'user_id', { actor: { $ne: 'system' } }), 0);
    assert.equal(await orphans(M.Transfer, 'case_id', 'cases', 'case_id'), 0);
    assert.equal(await orphans(M.OverlapGroundTruth, 'case_a', 'cases', 'case_id'), 0);
    assert.equal(await orphans(M.OverlapGroundTruth, 'case_b', 'cases', 'case_id'), 0);
    assert.equal(await orphans(M.InstAlias, 'expected_institution_id', 'institutions', 'institution_id'), 0);
  });

  test('cases with unverified identity have no institution link', async () => {
    const unverified = await M.Case.find({ identity_status: { $ne: 'VERIFIED' } }).lean();
    assert.equal(unverified.length, 4);
    for (const c of unverified) {
      assert.equal(c.institution_id, null);
      assert.ok(c.raw_institution_name);
    }
  });

  test('unique indexes reject duplicate identifiers at the database level', async () => {
    const existing = await M.Case.findOne({}).lean();
    const { _id, ...copy } = existing;
    await assert.rejects(M.Case.collection.insertOne({ ...copy }), /E11000/);
    const user = await M.User.findOne({}).lean();
    await assert.rejects(M.User.collection.insertOne({ user_id: 'SYN-USR-NEW', display_name: 'x', role: 'admin', email: user.email }), /E11000/);
    const inst = await M.Institution.findOne({}).lean();
    await assert.rejects(M.Institution.collection.insertOne({ ...inst, _id: undefined, institution_id: 'SYN-INST-9999' }), /E11000/);
  });

  test('source files were not modified by the import', () => {
    for (const f of first.files) {
      const sha = require('crypto').createHash('sha256').update(fs.readFileSync(path.join(REAL_DATA_DIR, f.file))).digest('hex');
      assert.equal(sha, f.sha256, f.file);
    }
  });
});

test.describe('validation, rejection and update behaviour', () => {
  test.after(disconnect);

  test('bad rows are rejected with reasons, and dependent rows are rejected too', async () => {
    await connectFresh('import_bad');
    const dir = copyFixtures();
    const cases = readRows(dir, 'cases.csv');
    const idx = (id) => cases.findIndex((c) => c.case_id === id);
    cases[idx('SYN-PGRC-2026-0001')].institution_id = 'SYN-INST-9999'; // unknown institution
    cases[idx('SYN-RB-2026-0002')].status = 'Closed'; // invalid enum
    cases.push({ ...cases[idx('SYN-AB-2026-0003')], subject: 'conflicting duplicate' }); // duplicate key, different content
    writeRows(dir, 'cases.csv', cases);

    const report = await runImport({ dataDir: dir });
    const rej = report.rejections.filter((r) => r.collection === 'cases');
    assert.equal(rej.length, 3);
    assert.match(rej.find((r) => r.key === 'SYN-PGRC-2026-0001').reasons.join(), /unknown institution_id/);
    assert.match(rej.find((r) => r.key === 'SYN-RB-2026-0002').reasons.join(), /not a valid enum value/);
    assert.match(rej.find((r) => r.key === 'SYN-AB-2026-0003').reasons.join(), /duplicate case_id/);

    // The first occurrence of the duplicated key is kept; rejected cases are absent.
    assert.equal(await M.Case.countDocuments({ case_id: { $in: ['SYN-PGRC-2026-0001', 'SYN-RB-2026-0002'] } }), 0);
    assert.equal((await M.Case.findOne({ case_id: 'SYN-AB-2026-0003' }).lean()).subject, 'Laboratory deficiency');

    // Actions, transfers and labelled pairs that point at rejected cases are rejected as well.
    const childRejects = report.rejections.filter((r) => r.collection !== 'cases');
    assert.ok(childRejects.some((r) => r.collection === 'case_actions' && /unknown case_id "SYN-PGRC-2026-0001"/.test(r.reasons.join())));
    assert.ok(childRejects.some((r) => r.collection === 'overlap_ground_truth' && /unknown case_a "SYN-PGRC-2026-0001"/.test(r.reasons.join())));
    assert.equal(await M.CaseAction.countDocuments({ case_id: 'SYN-PGRC-2026-0001' }), 0);
    // Rejection reports never carry record content.
    for (const r of report.rejections) assert.deepEqual(Object.keys(r).sort(), ['collection', 'file', 'key', 'reasons', 'row']);
    assert.equal(report.status, 'completed_with_rejections');
  });

  test('a changed source row is updated, everything else stays unchanged', async () => {
    await connectFresh('import_update');
    const dir = copyFixtures();
    await runImport({ dataDir: dir });
    const cases = readRows(dir, 'cases.csv');
    cases.find((c) => c.case_id === 'SYN-PGRC-2026-0001').next_action = 'Hearing scheduled';
    writeRows(dir, 'cases.csv', cases);

    const report = await runImport({ dataDir: dir });
    assert.equal(report.summary.cases.updated, 1);
    assert.equal(report.summary.cases.unchanged, cases.length - 1);
    const c = await M.Case.findOne({ case_id: 'SYN-PGRC-2026-0001' }).select('+import_meta').lean();
    assert.equal(c.next_action, 'Hearing scheduled');
    assert.notEqual(c.import_meta.first_import_batch, c.import_meta.last_changed_batch);
  });

  test('records not created by an import are never overwritten', async () => {
    await connectFresh('import_foreign');
    await M.Bureau.create({ code: 'PGRC', name: 'Manually created', sla_days_default: 10, provenance: 'SYNTHETIC' });
    const report = await runImport({ dataDir: REAL_DATA_DIR });
    assert.equal(report.summary.bureaus.skipped, 1);
    assert.equal((await M.Bureau.findOne({ code: 'PGRC' }).lean()).name, 'Manually created');
    assert.equal(report.summary.cases.rejected, 0); // references to PGRC still resolve
  });

  test('a missing file stops the import before anything is written', async () => {
    await connectFresh('import_missing');
    const dir = copyFixtures();
    fs.unlinkSync(path.join(dir, 'transfers.csv'));
    await assert.rejects(runImport({ dataDir: dir }), (e) => e.code === 'MISSING_FILE');
    assert.equal(await M.Bureau.countDocuments(), 0);
    assert.equal(await M.ImportBatch.countDocuments(), 0);
  });

  test('a file without a required column stops the import', async () => {
    await connectFresh('import_schema');
    const dir = copyFixtures();
    const rows = readRows(dir, 'bureaus.csv').map(({ sla_days_default, ...rest }) => rest);
    writeRows(dir, 'bureaus.csv', rows);
    await assert.rejects(runImport({ dataDir: dir }), (e) => e.code === 'SCHEMA_MISMATCH' && /sla_days_default/.test(e.message));
  });

  test('dry run validates without writing', async () => {
    await connectFresh('import_dry');
    const report = await runImport({ dataDir: REAL_DATA_DIR, dryRun: true });
    assert.equal(report.summary.cases.would_write, countRows('cases.csv'));
    assert.equal(await M.Case.countDocuments(), 0);
    assert.equal(await M.ImportBatch.countDocuments(), 0);
  });
});
