const fs = require('fs');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');

/**
 * Read a CSV file into an array of row objects (all values as strings) and return the file's
 * SHA-256 so each import batch records exactly which file version it read.
 * The source file is opened read-only and never modified.
 */
function readCsv(filePath, { expectedColumns = [] } = {}) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`Required data file is missing: ${filePath}`);
    err.code = 'MISSING_FILE';
    throw err;
  }
  const buf = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const rows = parse(buf, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: false, // a row with the wrong number of fields is a hard error
    trim: false,
  });
  const header = rows.length ? Object.keys(rows[0]) : readHeader(buf);
  const missing = expectedColumns.filter((c) => !header.includes(c));
  const extra = header.filter((c) => !expectedColumns.includes(c));
  if (missing.length) {
    const err = new Error(`${filePath} is missing required columns: ${missing.join(', ')}`);
    err.code = 'SCHEMA_MISMATCH';
    throw err;
  }
  return { rows, sha256, header, extraColumns: extra };
}

function readHeader(buf) {
  const firstLine = buf.toString('utf8').split(/\r?\n/)[0] || '';
  return parse(firstLine, { bom: true })[0] || [];
}

module.exports = { readCsv };
