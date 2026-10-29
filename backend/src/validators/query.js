/**
 * Small, dependency-free query-string validators. Each parser collects human-readable problems;
 * `assertValid` turns them into a 400 VALIDATION_ERROR with the list in `error.details`.
 */
const { apiError } = require('../utils/response');

const MAX_LIMIT = 100;
const MAX_Q_LENGTH = 100;

class QueryParser {
  constructor(query) {
    this.query = query || {};
    this.errors = [];
  }

  raw(name) {
    const v = this.query[name];
    if (Array.isArray(v)) {
      this.errors.push(`${name} must be given once`);
      return undefined;
    }
    if (v === undefined || v === '') return undefined;
    return String(v).trim();
  }

  int(name, { def, min, max }) {
    const v = this.raw(name);
    if (v === undefined) return def;
    if (!/^\d+$/.test(v)) { this.errors.push(`${name} must be a positive integer`); return def; }
    const n = Number(v);
    if (n < min || n > max) { this.errors.push(`${name} must be between ${min} and ${max}`); return def; }
    return n;
  }

  /** One value or a comma-separated list, each member of `allowed`. */
  enumList(name, allowed) {
    const v = this.raw(name);
    if (v === undefined) return undefined;
    const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
    const bad = parts.filter((p) => !allowed.includes(p));
    if (bad.length) { this.errors.push(`${name} has invalid value(s): ${bad.join(', ')}. Allowed: ${allowed.join(', ')}`); return undefined; }
    return parts;
  }

  bool(name) {
    const v = this.raw(name);
    if (v === undefined) return undefined;
    if (v === 'true') return true;
    if (v === 'false') return false;
    this.errors.push(`${name} must be true or false`);
    return undefined;
  }

  date(name) {
    const v = this.raw(name);
    if (v === undefined) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
      this.errors.push(`${name} must be a date in YYYY-MM-DD format`);
      return undefined;
    }
    return new Date(`${v}T00:00:00Z`);
  }

  id(name, re) {
    const v = this.raw(name);
    if (v === undefined) return undefined;
    if (!re.test(v)) { this.errors.push(`${name} has an invalid format`); return undefined; }
    return v;
  }

  text(name) {
    const v = this.raw(name);
    if (v === undefined) return undefined;
    if (v.length > MAX_Q_LENGTH) { this.errors.push(`${name} must be at most ${MAX_Q_LENGTH} characters`); return undefined; }
    return v;
  }

  sort(name, allowedFields, def) {
    const v = this.raw(name);
    if (v === undefined) return def;
    const field = v.replace(/^-/, '');
    if (!allowedFields.includes(field)) { this.errors.push(`${name} must be one of: ${allowedFields.join(', ')} (prefix "-" for descending)`); return def; }
    return { [field]: v.startsWith('-') ? -1 : 1 };
  }

  pagination() {
    return { page: this.int('page', { def: 1, min: 1, max: 100000 }), limit: this.int('limit', { def: 20, min: 1, max: MAX_LIMIT }) };
  }

  assertValid() {
    if (this.errors.length) throw apiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', this.errors);
  }
}

/** Escape user text before using it inside a RegExp. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ID_PATTERNS = {
  caseId: /^[A-Za-z0-9-]{3,40}$/,
  institutionId: /^[A-Za-z0-9-]{3,40}$/,
};

module.exports = { QueryParser, escapeRegex, ID_PATTERNS, MAX_LIMIT };
