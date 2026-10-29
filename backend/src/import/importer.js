/**
 * Idempotent, validating importer for the synthetic monitoring fixtures.
 *
 * Guarantees:
 *  - Source CSV files are only read, never written.
 *  - Nothing is deleted. Records not present in the files are left untouched.
 *  - A record is written only if it is new or its normalised source row changed
 *    (compared by import_meta.source_hash). A second run reports 0 inserted / 0 updated.
 *  - Records that exist in the DB but were not created by an import (no import_meta) are never
 *    overwritten; their rows are reported as skipped.
 *  - Every row is validated (types, enums, required fields, Mongoose schema rules) and every
 *    reference is checked before writing. A row whose parent was rejected is rejected too.
 *  - Rejection reports contain file, row number, key and reasons only, never record content.
 */
const path = require('path');
const crypto = require('crypto');
const { readCsv } = require('./csvReader');
const { applyTransformations, TRANSFORMATIONS } = require('./transformations');
const { SPECS } = require('./specs');
const { ImportBatch } = require('../models');
const { hashObject } = require('./normalize');

const WRITE_CHUNK = 500;

function newBatchId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `IMP-${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function emptyCounts() {
  return { read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, rejected: 0 };
}

/** Load keys + reference fields of records already in the DB so references to them resolve. */
async function loadExistingContext(ctx) {
  const M = require('../models');
  const [bureaus, institutions, users, cases] = await Promise.all([
    M.Bureau.find({}, { code: 1 }).lean(),
    M.Institution.find({}, { institution_id: 1, region: 1 }).lean(),
    M.User.find({}, { user_id: 1, bureau: 1 }).lean(),
    M.Case.find({}, { case_id: 1, institution_id: 1, bureau: 1, category: 1, receipt_date: 1 }).lean(),
  ]);
  bureaus.forEach((d) => ctx.bureaus.set(d.code, d));
  institutions.forEach((d) => ctx.institutions.set(d.institution_id, d));
  users.forEach((d) => ctx.users.set(d.user_id, d));
  cases.forEach((d) => ctx.cases.set(d.case_id, d));
}

function keyOf(spec, doc) {
  return spec.keyOf ? spec.keyOf(doc) : doc[spec.keyField];
}

function filterOf(spec, doc) {
  return spec.keyFilter ? spec.keyFilter(doc) : { [spec.keyField]: doc[spec.keyField] };
}

/** Map key -> { _id, import_meta } for records that already exist. */
async function fetchExisting(spec, docs) {
  const existing = new Map();
  const projection = { _id: 1, import_meta: 1 };
  if (spec.keyFilter) {
    const fields = Object.keys(spec.keyFilter(docs[0] || {}));
    const all = await spec.model.find({}, { ...projection, ...Object.fromEntries(fields.map((f) => [f, 1])) }).select('+import_meta').lean();
    all.forEach((d) => existing.set(keyOf(spec, d), d));
    return existing;
  }
  const keys = docs.map((d) => d[spec.keyField]);
  for (let i = 0; i < keys.length; i += 1000) {
    const found = await spec.model
      .find({ [spec.keyField]: { $in: keys.slice(i, i + 1000) } }, { ...projection, [spec.keyField]: 1 })
      .select('+import_meta')
      .lean();
    found.forEach((d) => existing.set(d[spec.keyField], d));
  }
  return existing;
}

/**
 * Validate one file. Returns accepted docs (with their import metadata) and per-row outcomes.
 * Accepted docs are registered in ctx so dependent files can reference them.
 */
function validateFile(spec, rows, ctx, report) {
  const counts = report.summary[spec.name];
  const accepted = [];
  const seenKeys = new Map(); // key -> source hash of first occurrence
  const seenUnique = {}; // uniqueField -> Map(value -> key)
  (spec.uniqueFields || []).forEach((f) => { seenUnique[f] = new Map(); });

  rows.forEach((raw, i) => {
    const rowNo = i + 1;
    counts.read += 1;
    const reject = (key, reasons) => {
      counts.rejected += 1;
      report.rejections.push({ collection: spec.name, file: spec.file, row: rowNo, key: key || null, reasons });
    };

    const { row, applied, sourceIds } = applyTransformations(spec.file, raw);
    let doc;
    try {
      doc = spec.toDoc(row);
    } catch (e) {
      reject(raw[spec.keyField] || null, [e.message]);
      return;
    }
    if (sourceIds.user_id) doc.source_user_id = sourceIds.user_id;
    const key = keyOf(spec, doc);
    const sourceHash = hashObject(doc);

    // Duplicate keys inside the same file.
    if (seenKeys.has(key)) {
      if (seenKeys.get(key) === sourceHash) {
        counts.skipped += 1;
        report.skips.push({ collection: spec.name, file: spec.file, row: rowNo, key, reason: 'exact duplicate of an earlier row (kept once)' });
      } else {
        reject(key, [`duplicate ${spec.keyField} with different content; the first occurrence was kept`]);
      }
      return;
    }

    const reasons = [];
    // Duplicate secondary unique values inside the file (e.g. e-mail, AICTE permanent ID).
    for (const f of spec.uniqueFields || []) {
      const v = f === 'pair' ? spec.pairKey(doc) : doc[f];
      if (v && seenUnique[f].has(v) && seenUnique[f].get(v) !== key) reasons.push(`duplicate ${f} "${v}" (already used by ${seenUnique[f].get(v)})`);
    }

    // Schema validation (types, enums, required, cross-field rules declared in the model).
    const instance = new spec.model(doc);
    const err = instance.validateSync();
    if (err) Object.values(err.errors).forEach((e) => reasons.push(e.message));

    reasons.push(...spec.checkRefs(doc, ctx));
    if (reasons.length) {
      reject(key, reasons);
      return;
    }

    seenKeys.set(key, sourceHash);
    for (const f of spec.uniqueFields || []) seenUnique[f].set(f === 'pair' ? spec.pairKey(doc) : doc[f], key);
    if (applied.length) {
      report.transformations.push({ collection: spec.name, file: spec.file, row: rowNo, key, applied });
    }
    spec.register(doc, ctx);
    accepted.push({ doc, key, rowNo, sourceHash, applied });
  });
  return accepted;
}

async function writeFile(spec, accepted, report, batchId, now) {
  const counts = report.summary[spec.name];
  if (!accepted.length) return;
  const existing = await fetchExisting(spec, accepted.map((a) => a.doc));
  const ops = [];
  const opMeta = [];

  for (const a of accepted) {
    const found = existing.get(a.key);
    const meta = {
      source_file: spec.file,
      source_row: a.rowNo,
      source_hash: a.sourceHash,
      first_import_batch: found?.import_meta?.first_import_batch || batchId,
      last_changed_batch: batchId,
      ...(a.applied.length ? { transformations: a.applied } : {}),
    };
    if (found && !found.import_meta) {
      counts.skipped += 1;
      report.skips.push({ collection: spec.name, file: spec.file, row: a.rowNo, key: a.key, reason: 'record exists and was not created by an import; left untouched' });
      continue;
    }
    if (found && found.import_meta.source_hash === a.sourceHash) {
      counts.unchanged += 1;
      continue;
    }
    // Cast through the model so stored types match what the app reads (dates, arrays, defaults).
    const casted = new spec.model({ ...a.doc, import_meta: meta }).toObject({ depopulate: true });
    delete casted._id;
    delete casted.createdAt;
    delete casted.updatedAt;
    if (found) {
      // Only overwrite fields that come from the source file (+ import_meta); never reset other fields
      // (e.g. a password hash or is_active flag set later by the application) to schema defaults.
      const set = { import_meta: casted.import_meta, updatedAt: now };
      Object.keys(a.doc).forEach((k) => { set[k] = casted[k]; });
      ops.push({ updateOne: { filter: { _id: found._id }, update: { $set: set } } });
      opMeta.push({ kind: 'updated', a });
    } else {
      ops.push({ updateOne: { filter: filterOf(spec, a.doc), update: { $setOnInsert: { ...casted, createdAt: now, updatedAt: now } }, upsert: true } });
      opMeta.push({ kind: 'inserted', a });
    }
  }

  for (let i = 0; i < ops.length; i += WRITE_CHUNK) {
    const chunk = ops.slice(i, i + WRITE_CHUNK);
    const metaChunk = opMeta.slice(i, i + WRITE_CHUNK);
    const failed = new Map();
    try {
      await spec.model.collection.bulkWrite(chunk, { ordered: false });
    } catch (e) {
      // Per-operation failures (e.g. a unique index violated by a record created outside the import).
      const writeErrors = e.writeErrors || (e.result && e.result.getWriteErrors && e.result.getWriteErrors()) || [];
      if (!writeErrors.length) throw e;
      writeErrors.forEach((we) => failed.set(we.index, we.errmsg || (we.err && we.err.errmsg) || 'write failed'));
    }
    metaChunk.forEach((m, idx) => {
      if (failed.has(idx)) {
        counts.rejected += 1;
        const msg = String(failed.get(idx));
        report.rejections.push({ collection: spec.name, file: spec.file, row: m.a.rowNo, key: m.a.key,
          reasons: [/E11000/.test(msg) ? 'unique constraint violated by an existing database record' : 'database write failed'] });
      } else {
        counts[m.kind] += 1;
      }
    });
  }
}

/**
 * Run the import.
 * @param {object} opts
 * @param {string} opts.dataDir   directory holding the fixture CSVs
 * @param {boolean} [opts.dryRun] validate only; read the DB for references but write nothing
 * @param {string} [opts.source]  label stored on the batch
 */
async function runImport({ dataDir, dryRun = false, source = 'synthetic-fixtures', now = new Date() }) {
  const batchId = newBatchId(now);
  const report = {
    batch_id: batchId,
    dry_run: dryRun,
    data_dir: path.resolve(dataDir),
    started_at: now.toISOString(),
    files: [],
    summary: Object.fromEntries(SPECS.map((s) => [s.name, emptyCounts()])),
    transformations: [],
    transformations_declared: TRANSFORMATIONS.map(({ id, file, description }) => ({ id, file, description })),
    rejections: [],
    skips: [],
    warnings: [],
  };

  // Read every file up front so a missing or malformed file stops the run before any write.
  const loaded = SPECS.map((spec) => {
    const file = path.join(dataDir, spec.file);
    const { rows, sha256, extraColumns } = readCsv(file, { expectedColumns: spec.columns });
    report.files.push({ file: spec.file, sha256, rows: rows.length });
    if (extraColumns.length) report.warnings.push(`${spec.file}: ignoring unexpected columns ${extraColumns.join(', ')}`);
    return { spec, rows };
  });

  const ctx = { bureaus: new Map(), institutions: new Map(), users: new Map(), cases: new Map() };
  await loadExistingContext(ctx);

  let batchDoc = null;
  if (!dryRun) {
    batchDoc = await ImportBatch.create({
      batch_id: batchId, source, data_dir: report.data_dir, started_at: now, files: report.files, status: 'running',
    });
  }

  try {
    for (const { spec, rows } of loaded) {
      const accepted = validateFile(spec, rows, ctx, report);
      if (!dryRun) await writeFile(spec, accepted, report, batchId, now);
      else report.summary[spec.name].would_write = accepted.length;
    }
  } catch (e) {
    if (batchDoc) {
      batchDoc.status = 'failed';
      batchDoc.finished_at = new Date();
      batchDoc.warnings = [...report.warnings, `fatal: ${e.message}`];
      await batchDoc.save();
    }
    throw e;
  }

  addDataQualityWarnings(report, loaded);
  report.finished_at = new Date().toISOString();
  report.status = report.rejections.length ? 'completed_with_rejections' : 'completed';

  if (batchDoc) {
    Object.assign(batchDoc, {
      finished_at: new Date(report.finished_at),
      status: report.status,
      summary: report.summary,
      transformations: report.transformations,
      rejections: report.rejections.slice(0, 5000),
      warnings: report.warnings,
    });
    await batchDoc.save();
  }
  return report;
}

/** Non-blocking observations about the fixtures that the team should know about. */
function addDataQualityWarnings(report, loaded) {
  const byName = Object.fromEntries(loaded.map((l) => [l.spec.name, l.rows]));
  const nowIso = new Date(report.started_at);
  const future = (byName.case_actions || []).filter((r) => new Date(`${r.ts.replace(' ', 'T')}Z`) > nowIso).length;
  if (future) {
    report.warnings.push(
      `case_actions.csv: ${future} action timestamps are later than the import time. The synthetic data is a snapshot ` +
        'generated "as of" 2026-10-31; these are synthetic, not real future events.'
    );
  }
  report.warnings.push(
    'cases.csv: is_overdue is a snapshot computed by the generator as of 2026-10-31; it is imported unchanged ' +
      'and is not recomputed against the current date in this phase.'
  );
}

module.exports = { runImport, newBatchId };
