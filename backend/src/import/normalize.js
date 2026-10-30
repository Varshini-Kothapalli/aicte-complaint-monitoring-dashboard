/**
 * Strict value parsers for CSV fields. Each throws a plain Error with a short message
 * (no record content) so the importer can report why a row was rejected.
 */
const crypto = require('crypto');

function str(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function requiredStr(v, field) {
  const s = str(v);
  if (s === null) throw new Error(`${field} is required`);
  return s;
}

function bool(v, field) {
  const s = str(v);
  if (s === null) throw new Error(`${field} is required (True/False)`);
  if (/^true$/i.test(s)) return true;
  if (/^false$/i.test(s)) return false;
  throw new Error(`${field} must be True or False`);
}

function int(v, field) {
  const s = str(v);
  if (s === null || !/^-?\d+$/.test(s)) throw new Error(`${field} must be an integer`);
  return Number(s);
}

function num(v, field) {
  const s = str(v);
  if (s === null || !/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`${field} must be a number`);
  return Number(s);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:MM[:SS]". The fixtures carry no timezone; they are
 * interpreted as UTC so that date-only values round-trip unchanged (documented in docs/DATA_IMPORT.md).
 */
function date(v, field, { required = true } = {}) {
  const s = str(v);
  if (s === null) {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  const m = DATE_RE.exec(s);
  if (!m) throw new Error(`${field} must be YYYY-MM-DD or YYYY-MM-DD HH:MM:SS`);
  const [, y, mo, d, h = '00', mi = '00', se = '00'] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
  // Reject impossible dates such as 2026-02-31 (Date would silently roll them over).
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) {
    throw new Error(`${field} is not a valid calendar date`);
  }
  return dt;
}

function list(v, sep = ';') {
  const s = str(v);
  if (s === null) return [];
  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

/** Stable SHA-256 of a plain object (keys sorted, Dates as ISO strings). */
function hashObject(obj) {
  const stable = (val) => {
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) return val.map(stable);
    if (val && typeof val === 'object') {
      return Object.keys(val).sort().reduce((acc, k) => ({ ...acc, [k]: stable(val[k]) }), {});
    }
    return val;
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(obj))).digest('hex');
}

module.exports = { str, requiredStr, bool, int, num, date, list, hashObject };
