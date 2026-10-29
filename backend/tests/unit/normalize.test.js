const test = require('node:test');
const assert = require('node:assert/strict');
const n = require('../../src/import/normalize');

test('str trims and maps empty to null', () => {
  assert.equal(n.str('  x '), 'x');
  assert.equal(n.str(''), null);
  assert.equal(n.str('   '), null);
  assert.equal(n.str(undefined), null);
});

test('bool accepts only True/False (any case)', () => {
  assert.equal(n.bool('True', 'f'), true);
  assert.equal(n.bool('false', 'f'), false);
  assert.throws(() => n.bool('yes', 'f'), /must be True or False/);
  assert.throws(() => n.bool('', 'f'), /required/);
});

test('int and num reject non-numeric text', () => {
  assert.equal(n.int('1999', 'y'), 1999);
  assert.throws(() => n.int('19.5', 'y'), /integer/);
  assert.equal(n.num('0.25', 'p'), 0.25);
  assert.throws(() => n.num('abc', 'p'), /number/);
});

test('date parses date-only and datetime values as UTC', () => {
  assert.equal(n.date('2026-09-20', 'd').toISOString(), '2026-09-20T00:00:00.000Z');
  assert.equal(n.date('2026-10-27 13:05:09', 'd').toISOString(), '2026-10-27T13:05:09.000Z');
});

test('date rejects impossible or badly formatted values', () => {
  assert.throws(() => n.date('2026-02-31', 'd'), /valid calendar date/);
  assert.throws(() => n.date('20/09/2026', 'd'), /YYYY-MM-DD/);
  assert.throws(() => n.date('', 'd'), /required/);
  assert.equal(n.date('', 'd', { required: false }), null);
});

test('list splits on semicolons and drops blanks', () => {
  assert.deepEqual(n.list('SYN-PGRC-2026-0001; SYN/LTR/2026/1 ;'), ['SYN-PGRC-2026-0001', 'SYN/LTR/2026/1']);
  assert.deepEqual(n.list(''), []);
});

test('hashObject is stable regardless of key order', () => {
  const d = new Date('2026-01-01T00:00:00Z');
  assert.equal(n.hashObject({ a: 1, b: d }), n.hashObject({ b: d, a: 1 }));
  assert.notEqual(n.hashObject({ a: 1 }), n.hashObject({ a: 2 }));
});
