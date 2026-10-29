#!/usr/bin/env node
/**
 * Import the synthetic monitoring fixtures into MongoDB.
 *
 *   npm run seed                      # validate + import (idempotent; safe to re-run)
 *   npm run seed:dry-run              # validate only, write nothing
 *   node scripts/seed_database.js --data-dir <dir> --report out.json --strict
 *
 * Options
 *   --data-dir <dir>   CSV directory (default: DATA_DIR env or data/processed/extracted/csv)
 *   --dry-run          validate and report without writing
 *   --strict           exit with code 2 if any row is rejected
 *   --report <file>    also write the full JSON report to <file>
 *   --quiet            print only the summary table
 *
 * This script never deletes or resets data. Exit codes: 0 ok, 1 fatal error, 2 rejections in --strict mode.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const { ensureIndexes } = require('../src/models');
const { runImport } = require('../src/import/importer');

function parseArgs(argv) {
  const args = { dryRun: false, strict: false, quiet: false, dataDir: config.dataDir, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--data-dir') args.dataDir = path.resolve(argv[++i]);
    else if (a === '--report') args.report = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown option: ${a}`);
  }
  return args;
}

/** Hide credentials if the connection string contains them. */
function redactUri(uri) {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

function printReport(report, { quiet }) {
  const cols = ['read', 'inserted', 'updated', 'unchanged', 'skipped', 'rejected'];
  if (report.dry_run) cols.splice(1, 3, 'would_write');
  const rows = Object.entries(report.summary).map(([name, c]) => [name, ...cols.map((k) => c[k] ?? 0)]);
  const totals = ['TOTAL', ...cols.map((k, i) => rows.reduce((s, r) => s + r[i + 1], 0))];
  const table = [['collection', ...cols], ...rows, totals];
  const widths = table[0].map((_, i) => Math.max(...table.map((r) => String(r[i]).length)));
  const line = (r) => r.map((v, i) => (i === 0 ? String(v).padEnd(widths[i]) : String(v).padStart(widths[i]))).join('  ');
  console.log(`\nImport batch ${report.batch_id}${report.dry_run ? '  (DRY RUN - nothing written)' : ''}`);
  console.log(`Data dir: ${report.data_dir}`);
  console.log(line(table[0]));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  rows.forEach((r) => console.log(line(r)));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  console.log(line(totals));

  if (!quiet) {
    if (report.transformations.length) {
      console.log('\nDocumented transformations applied:');
      report.transformations.forEach((t) => console.log(`  ${t.file} row ${t.row} -> ${t.key}: ${t.applied.join(', ')}`));
    }
    if (report.skips.length) {
      console.log(`\nSkipped rows (${report.skips.length}):`);
      report.skips.slice(0, 20).forEach((s) => console.log(`  ${s.file} row ${s.row} [${s.key}]: ${s.reason}`));
      if (report.skips.length > 20) console.log(`  ... ${report.skips.length - 20} more (see --report)`);
    }
    if (report.rejections.length) {
      console.log(`\nRejected rows (${report.rejections.length}):`);
      report.rejections.slice(0, 30).forEach((r) => console.log(`  ${r.file} row ${r.row} [${r.key}]: ${r.reasons.join('; ')}`));
      if (report.rejections.length > 30) console.log(`  ... ${report.rejections.length - 30} more (see --report)`);
    }
    if (report.warnings.length) {
      console.log('\nWarnings:');
      report.warnings.forEach((w) => console.log(`  - ${w}`));
    }
  }
  console.log(`\nStatus: ${report.status}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    return 0;
  }
  console.log(`Connecting to ${redactUri(config.mongo.uri)} ...`);
  await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: config.mongo.connectTimeoutMS, autoIndex: false });
  try {
    if (!args.dryRun) await ensureIndexes();
    const report = await runImport({ dataDir: args.dataDir, dryRun: args.dryRun });
    printReport(report, args);
    if (args.report) {
      fs.writeFileSync(args.report, JSON.stringify(report, null, 2));
      console.log(`Full report written to ${args.report}`);
    }
    return args.strict && report.rejections.length ? 2 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`\nImport failed: ${err.message}`);
    if (err.code === 'MISSING_FILE' || err.code === 'SCHEMA_MISMATCH') {
      console.error('No records were written. Restore the missing/invalid file and re-run.');
    }
    process.exit(1);
  });
