const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../src/models');

const baseCase = () => ({
  case_id: 'SYN-PGRC-2026-9999',
  institution_id: 'SYN-INST-0001',
  identity_status: 'VERIFIED',
  receipt_date: new Date('2026-09-01'),
  category: 'fee_refund',
  bureau: 'PGRC',
  assigned_officer: 'SYN-USR-PGRC-01',
  status: 'Under Process',
  expected_disposal_date: new Date('2026-10-01'),
  is_overdue: false,
  was_transferred: false,
  subject: 's',
  description: 'd',
  complainant_hash: 'h',
  provenance: 'SYNTHETIC',
});

const errorsOf = (doc) => {
  const err = doc.validateSync();
  return err ? Object.keys(err.errors) : [];
};

test('a complete case validates', () => {
  assert.deepEqual(errorsOf(new M.Case(baseCase())), []);
});

test('a VERIFIED case needs an institution; an unverified one must not have one', () => {
  assert.ok(errorsOf(new M.Case({ ...baseCase(), institution_id: null })).includes('institution_id'));
  assert.ok(errorsOf(new M.Case({ ...baseCase(), identity_status: 'VERIFICATION_QUEUE' })).includes('institution_id'));
  assert.deepEqual(errorsOf(new M.Case({ ...baseCase(), identity_status: 'UNRESOLVED', institution_id: null })), []);
});

test('an officer is required once a case is past Received', () => {
  assert.ok(errorsOf(new M.Case({ ...baseCase(), assigned_officer: null })).includes('assigned_officer'));
  assert.deepEqual(errorsOf(new M.Case({ ...baseCase(), status: 'Received', assigned_officer: null })), []);
});

test('enums are enforced', () => {
  const e = errorsOf(new M.Case({ ...baseCase(), bureau: 'XYZ', status: 'Closed', category: 'nope', provenance: 'REAL' }));
  for (const f of ['bureau', 'status', 'category', 'provenance']) assert.ok(e.includes(f), f);
});

test('internal fields are excluded from queries by default', () => {
  const hidden = ['complainant_ref', 'matter_id', 'design_note', 'import_meta'];
  for (const f of hidden) assert.equal(M.Case.schema.path(f).options.select, false, f);
  assert.equal(M.User.schema.path('password_hash').options.select, false);
});

test('transfers must move between different Bureaus and accepted ones need acceptance details', () => {
  const t = new M.Transfer({ transfer_key: 'k', case_id: 'c', from_bureau: 'AB', to_bureau: 'AB', reason: 'r', requested_by: 'u', requested_at: new Date(), state: 'accepted' });
  const e = errorsOf(t);
  for (const f of ['to_bureau', 'accepted_by', 'accepted_at']) assert.ok(e.includes(f), f);
});

test('unique indexes are declared on natural keys', () => {
  const uniques = (model) => model.schema.indexes().filter(([, o]) => o.unique).map(([k]) => Object.keys(k).join('+'));
  const pathsUnique = (model) => Object.entries(model.schema.paths).filter(([, p]) => p.options.unique).map(([k]) => k);
  assert.deepEqual(pathsUnique(M.Case), ['case_id']);
  assert.deepEqual(pathsUnique(M.Institution).sort(), ['aicte_permanent_id', 'institution_id']);
  assert.deepEqual(pathsUnique(M.User).sort(), ['email', 'user_id']);
  assert.deepEqual(pathsUnique(M.CaseAction), ['action_key']);
  assert.ok(uniques(M.CategoryMatrix).includes('category_a+category_b'));
  assert.ok(uniques(M.OverlapGroundTruth).includes('case_a+case_b'));
});
