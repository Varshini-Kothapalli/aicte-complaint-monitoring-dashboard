const test = require('node:test');
const assert = require('node:assert/strict');
const requireDatabase = require('../../src/middleware/requireDatabase');

test('requests fail fast with 503 when MongoDB is not connected', () => {
  let passed;
  requireDatabase({}, {}, (err) => { passed = err; });
  assert.equal(passed.statusCode, 503);
  assert.equal(passed.code, 'DATABASE_UNAVAILABLE');
});
