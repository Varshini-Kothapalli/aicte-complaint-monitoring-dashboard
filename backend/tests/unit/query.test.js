const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryParser, escapeRegex } = require('../../src/validators/query');

test('pagination defaults and bounds', () => {
  assert.deepEqual(new QueryParser({}).pagination(), { page: 1, limit: 20 });
  const q = new QueryParser({ page: '0', limit: '101' });
  q.pagination();
  assert.equal(q.errors.length, 2);
  assert.throws(() => q.assertValid(), (e) => e.statusCode === 400 && e.code === 'VALIDATION_ERROR' && e.details.length === 2);
});

test('enumList accepts comma lists and rejects unknown values', () => {
  const q = new QueryParser({ bureau: 'PGRC,RB', status: 'Closed' });
  assert.deepEqual(q.enumList('bureau', ['PGRC', 'RB', 'AB']), ['PGRC', 'RB']);
  assert.equal(q.enumList('status', ['Received']), undefined);
  assert.match(q.errors[0], /invalid value/);
});

test('repeated parameters are rejected', () => {
  const q = new QueryParser({ bureau: ['PGRC', 'RB'] });
  assert.equal(q.raw('bureau'), undefined);
  assert.equal(q.errors.length, 1);
});

test('bool, date, sort and text validation', () => {
  const q = new QueryParser({ a: 'true', b: 'yes', d: '2026-02-30x', s: '-receipt_date', bad: 'password', t: 'x'.repeat(101) });
  assert.equal(q.bool('a'), true);
  assert.equal(q.bool('b'), undefined);
  assert.equal(q.date('d'), undefined);
  assert.deepEqual(q.sort('s', ['receipt_date'], null), { receipt_date: -1 });
  assert.equal(q.sort('bad', ['receipt_date'], null), null);
  assert.equal(q.text('t'), undefined);
  assert.equal(q.errors.length, 4);
});

test('escapeRegex neutralises regex metacharacters', () => {
  const re = new RegExp(escapeRegex('a.b*(c)'));
  assert.ok(re.test('xa.b*(c)y'));
  assert.ok(!re.test('aXbbbc'));
});
