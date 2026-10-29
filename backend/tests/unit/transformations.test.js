const test = require('node:test');
const assert = require('node:assert/strict');
const { applyTransformations } = require('../../src/import/transformations');
const { readRows, REAL_DATA_DIR } = require('../helpers/fixtures');

const NE = { user_id: 'SYN-USR-REG-NORTHE', display_name: 'Regional Official (North-East)', role: 'regional_official', bureau: '', region: 'North-East', email: 'reg-northe@demo.invalid', provenance: 'SYNTHETIC' };
const NORTHERN = { ...NE, display_name: 'Regional Official (Northern)', region: 'Northern' };

test('T1 renames only the North-East regional official', () => {
  const ne = applyTransformations('users.csv', NE);
  assert.equal(ne.row.user_id, 'SYN-USR-REG-NE');
  assert.equal(ne.row.email, 'reg-ne@demo.invalid');
  assert.deepEqual(ne.applied, ['T1-users-regional-id-collision']);
  assert.equal(ne.sourceIds.user_id, 'SYN-USR-REG-NORTHE');

  const north = applyTransformations('users.csv', NORTHERN);
  assert.deepEqual(north.row, NORTHERN);
  assert.deepEqual(north.applied, []);
});

test('T1 does not apply to other files and does not mutate the input row', () => {
  const copy = { ...NE };
  assert.deepEqual(applyTransformations('cases.csv', NE).applied, []);
  applyTransformations('users.csv', NE);
  assert.deepEqual(NE, copy);
});

test('the collision T1 fixes exists in the real users.csv, and T1 removes it', () => {
  const rows = readRows(REAL_DATA_DIR, 'users.csv');
  const ids = rows.map((r) => r.user_id);
  assert.ok(ids.filter((id) => id === 'SYN-USR-REG-NORTHE').length === 2, 'expected the documented collision in the source file');
  const after = rows.map((r) => applyTransformations('users.csv', r).row);
  assert.equal(new Set(after.map((r) => r.user_id)).size, rows.length);
  assert.equal(new Set(after.map((r) => r.email)).size, rows.length);
});
