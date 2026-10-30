#!/usr/bin/env node
/**
 * Scan for possible duplicate complaints (rule-based duplicate review, rules-v1).
 *
 *   npm run duplicates:scan              # store / refresh MEDIUM and HIGH pairs (DERIVED)
 *   npm run duplicates:scan -- --evaluate  # also print precision / recall against the labelled
 *                                          # synthetic pairs (technical evaluation only)
 *
 * Safe to re-run. It never changes a complaint, never deletes a pair, and never alters a pair
 * an official has already decided. Run it after `npm run seed`.
 */
const mongoose = require('mongoose');
const config = require('../src/config/env');
const { ensureIndexes } = require('../src/models');
const { scanDuplicates, evaluate } = require('../src/services/duplicate.service');

(async () => {
  const evaluateToo = process.argv.includes('--evaluate');
  await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: config.mongo.connectTimeoutMS, autoIndex: false });
  try {
    await ensureIndexes();
    const r = await scanDuplicates();
    console.log(`Duplicate review scan (${r.rules_version}, dates as of ${r.as_of})`);
    console.log(`  Active complaints with verified institution: ${r.eligible_cases}`);
    console.log(`  Cross-Bureau pairs compared:                 ${r.pairs_compared}`);
    console.log(`  Pairs flagged for review (MEDIUM/HIGH):      ${r.flagged}`);
    console.log(`  inserted ${r.inserted} · updated ${r.updated} · unchanged ${r.unchanged} · already decided (kept) ${r.kept_decided} · no longer flagged ${r.deactivated}`);
    if (evaluateToo) {
      const e = await evaluate();
      console.log('\nTechnical evaluation against labelled synthetic pairs (optimistic: thresholds were tuned on this data):');
      console.log(`  precision ${e.precision.toFixed(2)} · recall ${e.recall.toFixed(2)} · tp ${e.tp} fp ${e.fp} fn ${e.fn} tn ${e.tn}`);
    }
  } finally {
    await mongoose.disconnect();
  }
})().catch((e) => {
  console.error(`Scan failed: ${e.message}`);
  process.exit(1);
});
