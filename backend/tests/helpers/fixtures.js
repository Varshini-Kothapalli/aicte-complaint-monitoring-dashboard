/**
 * Fixture helpers: tests that need modified CSVs copy the real fixture directory into a temp
 * directory and edit the copies. The original files in data/ are never touched.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parse } = require('csv-parse/sync');
const config = require('../../src/config/env');

const REAL_DATA_DIR = config.dataDir;

function copyFixtures() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicte-fixtures-'));
  for (const f of fs.readdirSync(REAL_DATA_DIR)) {
    if (f.endsWith('.csv')) fs.copyFileSync(path.join(REAL_DATA_DIR, f), path.join(dir, f));
  }
  return dir;
}

function readRows(dir, file) {
  return parse(fs.readFileSync(path.join(dir, file)), { columns: true, bom: true, skip_empty_lines: true });
}

function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeRows(dir, file, rows) {
  const cols = Object.keys(rows[0]);
  const text = [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, file), text);
}

function countRows(file, dir = REAL_DATA_DIR) {
  return readRows(dir, file).length;
}

module.exports = { REAL_DATA_DIR, copyFixtures, readRows, writeRows, countRows };
