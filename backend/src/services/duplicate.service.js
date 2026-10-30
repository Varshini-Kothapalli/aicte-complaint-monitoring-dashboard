/**
 * Possible-duplicate complaint review (first, rule-based version of Engine D2).
 *
 * What it does
 *   - Looks only at ACTIVE complaints whose institution identity is VERIFIED.
 *   - Compares complaints at the SAME institution handled by DIFFERENT Bureaus, received
 *     within 180 days of each other. Being at the same institution earns no points by itself.
 *   - Scores each pair from explainable signals and stores MEDIUM / HIGH pairs in
 *     `overlap_candidates` (provenance DERIVED) with plain-language reasons.
 *
 * What it never does
 *   - It never merges, closes, transfers or pauses a complaint. Only an official's recorded
 *     decision (decide()) changes the review status, and that decision is audited.
 *   - It never reads the evaluation labels (overlap_ground_truth) or generator fields.
 *
 * Not implemented yet: sentence-embedding similarity (all-MiniLM-L6-v2). "Similar wording" here
 * is a TF-IDF word-overlap measure, which is simpler and fully explainable.
 */
const crypto = require('crypto');
const config = require('../config/env');
const { personaFor } = require('../config/demoPersonas');
const { Case, CategoryMatrix, OverlapCandidate, CaseAction, AuditLog, User, Institution } = require('../models');
const { ACTIVE_CASE_STATUS } = require('../models/constants');

const RULES_VERSION = 'rules-v1';
const WINDOW_DAYS = 180;
const WEIGHTS = { rules: 0.45, wording: 0.4, meta: 0.15 };
const BANDS = { HIGH: 0.75, MEDIUM: 0.55 };
// Cosine values are rescaled so that wording typical of unrelated complaints scores ~0 and
// clearly shared wording scores 1. Calibrated on the labelled synthetic pairs (see docs/DUPLICATE_REVIEW.md).
const WORDING_FLOOR = 0.05;
const WORDING_CEIL = 0.15;

const STOPWORDS = new Set(`a about above after again against all also am an and any are as at be because been before being below between
both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into
is it its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than
that the their them then there these they this those through to too under until up very was we were what when where which while who whom
why will with would you your yours sir madam kindly please request dear respected regarding reg institute institution college university
also may said per one two three months month year years since even still now`.split(/\s+/));

// Reference numbers and complaint IDs are handled by the reference rule, not by wording.
const REF_PATTERN = /\b[A-Za-z]+(?:\/[A-Za-z0-9]+){2,}\b|\b[A-Z]{2,5}-[A-Z]{2,5}-\d{4}-\d+\b/g;

function tokenize(text, extraStop = new Set()) {
  return (text.replace(REF_PATTERN, ' ').toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOPWORDS.has(w) && !extraStop.has(w));
}

function humanize(v) {
  const s = String(v).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function displayCaseId(id) {
  return id.replace(/^SYN-/, '').replace(/-(\d{4})-/, '/$1/');
}

const pairKeyOf = (a, b) => [a, b].sort().join(':');
const dayMs = 24 * 3600 * 1000;

/** TF-IDF vectors (Map term -> weight, L2-normalised) for every case. */
function buildVectors(cases, institutionWords) {
  const docs = cases.map((c) => tokenize(`${c.subject} ${c.description}`, institutionWords.get(c.institution_id)));
  const df = new Map();
  docs.forEach((toks) => new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  const n = docs.length;
  return docs.map((toks) => {
    const tf = new Map();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    const v = new Map();
    let norm = 0;
    tf.forEach((count, t) => {
      const w = (1 + Math.log(count)) * Math.log((1 + n) / (1 + df.get(t)));
      v.set(t, w);
      norm += w * w;
    });
    norm = Math.sqrt(norm) || 1;
    v.forEach((w, t) => v.set(t, w / norm));
    return v;
  });
}

function cosineWithTerms(a, b) {
  let dot = 0;
  const shared = [];
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  small.forEach((w, t) => {
    if (large.has(t)) {
      const contrib = w * large.get(t);
      dot += contrib;
      shared.push([t, contrib]);
    }
  });
  shared.sort((x, y) => y[1] - x[1]);
  return { cosine: dot, terms: shared.slice(0, 4).map(([t]) => t) };
}

/** Score one pair. Returns null when the pair is out of scope. */
function scorePair(a, b, ctx) {
  const reasons = [];
  // --- Rule signals
  let rules = 0;
  const refsA = new Set(a.refs || []);
  const refsB = new Set(b.refs || []);
  const sharedRefs = [...refsA].filter((r) => refsB.has(r));
  const citesOther = refsA.has(b.case_id) || refsB.has(a.case_id);
  if (sharedRefs.length || citesOther) {
    rules += 0.5;
    if (citesOther) reasons.push('One complaint refers directly to the other complaint number');
    if (sharedRefs.length) reasons.push(`Both complaints cite the same reference (${sharedRefs.slice(0, 2).join(', ')})`);
  }
  const related = ctx.related.has(`${a.category}|${b.category}`) || ctx.related.has(`${b.category}|${a.category}`);
  if (related) {
    rules += 0.25;
    reasons.push(`Related complaint types: ${humanize(a.category)} (${a.bureau}) and ${humanize(b.category)} (${b.bureau})`);
  }
  if (a.complainant_hash && a.complainant_hash === b.complainant_hash) {
    rules += 0.15;
    reasons.push('Filed by the same complainant');
  }
  const gapDays = Math.round(Math.abs(a.receipt_date - b.receipt_date) / dayMs);
  if (gapDays <= 30) {
    rules += 0.1;
    reasons.push(`Received ${gapDays} day${gapDays === 1 ? '' : 's'} apart`);
  }
  rules = Math.min(rules, 1);

  // --- Wording similarity
  const { cosine, terms } = cosineWithTerms(ctx.vectors.get(a.case_id), ctx.vectors.get(b.case_id));
  const wording = Math.max(0, Math.min(1, (cosine - WORDING_FLOOR) / (WORDING_CEIL - WORDING_FLOOR)));
  if (wording >= 0.5 && terms.length) reasons.push(`Similar wording (both mention: ${terms.join(', ')})`);

  // --- Case-handling signals
  const asOf = ctx.asOf;
  const pastHalf = (c) => {
    const total = c.expected_disposal_date - c.receipt_date;
    return total > 0 && asOf - c.receipt_date > total / 2;
  };
  let meta = 0;
  if (pastHalf(a) && pastHalf(b)) meta += 0.5;
  if (a.is_overdue || b.is_overdue) meta += 0.5;

  const score = WEIGHTS.rules * rules + WEIGHTS.wording * wording + WEIGHTS.meta * meta;
  let band = 'NONE';
  if (score >= BANDS.HIGH || sharedRefs.length || citesOther) band = 'HIGH';
  else if (score >= BANDS.MEDIUM) band = 'MEDIUM';
  return {
    score: Math.round(score * 100) / 100,
    band,
    reasons,
    components: { rules: Math.round(rules * 100) / 100, wording: Math.round(wording * 100) / 100, meta, wording_cosine: Math.round(cosine * 1000) / 1000 },
  };
}

/** Compute candidate pairs in memory (no writes). Exported for evaluation and tests. */
async function computeCandidates({ asOf = new Date(`${config.datasetSnapshotDate}T00:00:00Z`) } = {}) {
  const [allCases, rules, institutions] = await Promise.all([
    Case.find({}, { case_id: 1, institution_id: 1, identity_status: 1, bureau: 1, category: 1, status: 1, subject: 1, description: 1,
      refs: 1, receipt_date: 1, expected_disposal_date: 1, is_overdue: 1, complainant_hash: 1 }).lean(),
    CategoryMatrix.find({}, { category_a: 1, category_b: 1 }).lean(),
    Institution.find({}, { institution_id: 1, name: 1, district: 1, state: 1 }).lean(),
  ]);
  // Words from the institution's own name/location would make every complaint at that institution look alike.
  const institutionWords = new Map(institutions.map((i) => [i.institution_id, new Set(tokenize(`${i.name} ${i.district} ${i.state}`))]));
  const vectorsArr = buildVectors(allCases, institutionWords);
  const ctx = {
    asOf,
    related: new Set(rules.map((r) => `${r.category_a}|${r.category_b}`)),
    vectors: new Map(allCases.map((c, i) => [c.case_id, vectorsArr[i]])),
  };

  const eligible = allCases.filter((c) => c.identity_status === 'VERIFIED' && c.institution_id && ACTIVE_CASE_STATUS.includes(c.status));
  const byInst = new Map();
  eligible.forEach((c) => byInst.set(c.institution_id, [...(byInst.get(c.institution_id) || []), c]));

  const out = [];
  let compared = 0;
  byInst.forEach((list, institutionId) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const [a, b] = [list[i], list[j]].sort((x, y) => x.case_id.localeCompare(y.case_id));
        if (a.bureau === b.bureau) continue; // same-Bureau duplicates are the owning Bureau's own check
        if (Math.abs(a.receipt_date - b.receipt_date) > WINDOW_DAYS * dayMs) continue;
        compared += 1;
        const s = scorePair(a, b, ctx);
        out.push({ pair_key: pairKeyOf(a.case_id, b.case_id), case_a: a.case_id, case_b: b.case_id, institution_id: institutionId, ...s });
      }
    }
  });
  return { pairs: out, compared, eligibleCases: eligible.length };
}

/**
 * Store MEDIUM/HIGH pairs. Pairs already decided by an official are never changed.
 * Pending pairs that no longer qualify are deactivated (alert_active=false), never deleted.
 */
async function scanDuplicates(opts = {}) {
  const { pairs, compared, eligibleCases } = await computeCandidates(opts);
  const flagged = pairs.filter((p) => p.band !== 'NONE');
  const existing = new Map((await OverlapCandidate.find({}).lean()).map((c) => [c.pair_key, c]));
  const counts = { eligible_cases: eligibleCases, pairs_compared: compared, flagged: flagged.length, inserted: 0, updated: 0, unchanged: 0, kept_decided: 0, deactivated: 0 };
  const now = new Date();
  const ops = [];

  for (const p of flagged) {
    const prev = existing.get(p.pair_key);
    const doc = { case_a: p.case_a, case_b: p.case_b, institution_id: p.institution_id, score: p.score, band: p.band, reasons: p.reasons };
    if (!prev) {
      ops.push({ insertOne: { document: { pair_key: p.pair_key, ...doc, alert_active: true, official_decision: 'pending', provenance: 'DERIVED', createdAt: now, updatedAt: now } } });
      counts.inserted += 1;
    } else if (prev.official_decision !== 'pending') {
      counts.kept_decided += 1;
    } else if (prev.score === p.score && prev.band === p.band && prev.alert_active && JSON.stringify(prev.reasons) === JSON.stringify(p.reasons)) {
      counts.unchanged += 1;
    } else {
      ops.push({ updateOne: { filter: { pair_key: p.pair_key, official_decision: 'pending' }, update: { $set: { ...doc, alert_active: true, updatedAt: now } } } });
      counts.updated += 1;
    }
  }
  const flaggedKeys = new Set(flagged.map((p) => p.pair_key));
  existing.forEach((prev, key) => {
    if (!flaggedKeys.has(key) && prev.official_decision === 'pending' && prev.alert_active) {
      ops.push({ updateOne: { filter: { pair_key: key, official_decision: 'pending' }, update: { $set: { alert_active: false, updatedAt: now } } } });
      counts.deactivated += 1;
    }
  });
  if (ops.length) await OverlapCandidate.collection.bulkWrite(ops, { ordered: false });
  return { rules_version: RULES_VERSION, as_of: config.datasetSnapshotDate, ...counts };
}

/* ------------------------------------------------------------------ reading and deciding */

const CASE_FIELDS = { _id: 0, case_id: 1, bureau: 1, category: 1, subject: 1, description: 1, status: 1, receipt_date: 1,
  expected_disposal_date: 1, assigned_officer: 1, is_overdue: 1, institution_id: 1, refs: 1 };

async function enrichPairs(pairs) {
  const caseIds = [...new Set(pairs.flatMap((p) => [p.case_a, p.case_b]))];
  const instIds = [...new Set(pairs.map((p) => p.institution_id))];
  const [cases, insts] = await Promise.all([
    Case.find({ case_id: { $in: caseIds } }, CASE_FIELDS).lean(),
    Institution.find({ institution_id: { $in: instIds } }, { _id: 0, institution_id: 1, name: 1, district: 1, state: 1, aicte_permanent_id: 1, provenance: 1 }).lean(),
  ]);
  const userIds = [...new Set([...cases.map((c) => c.assigned_officer), ...pairs.map((p) => p.decided_by)].filter(Boolean))];
  const users = await User.find({ user_id: { $in: userIds } }, { _id: 0, user_id: 1, display_name: 1, provenance: 1 }).lean();
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const caseById = new Map(cases.map((c) => [c.case_id, { ...c, assigned_officer_display: c.assigned_officer ? personaFor(c.assigned_officer, userById.get(c.assigned_officer)) : null }]));
  const instById = new Map(insts.map((i) => [i.institution_id, i]));
  return pairs.map(({ _id, __v, ...p }) => ({
    ...p,
    complaint_a: caseById.get(p.case_a) || null,
    complaint_b: caseById.get(p.case_b) || null,
    institution: instById.get(p.institution_id) || null,
    decided_by_display: p.decided_by ? personaFor(p.decided_by, userById.get(p.decided_by)) : null,
  }));
}

async function listCandidates({ status, band, institution_id, page, limit, includeInactive = false }) {
  const f = {};
  if (status) f.official_decision = { $in: status };
  if (band) f.band = { $in: band };
  if (institution_id) f.institution_id = institution_id;
  if (!includeInactive) f.$or = [{ alert_active: true }, { official_decision: { $ne: 'pending' } }];
  const [total, items, summaryRows] = await Promise.all([
    OverlapCandidate.countDocuments(f),
    OverlapCandidate.find(f).sort({ official_decision: -1, band: 1, score: -1, pair_key: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    OverlapCandidate.aggregate([
      { $match: { $or: [{ alert_active: true }, { official_decision: { $ne: 'pending' } }] } },
      { $group: { _id: { d: '$official_decision', b: '$band' }, n: { $sum: 1 } } },
    ]),
  ]);
  const summary = { pending: 0, confirmed_linked: 0, dismissed_unrelated: 0, HIGH: 0, MEDIUM: 0, total: 0 };
  summaryRows.forEach((r) => {
    summary[r._id.d] += r.n;
    if (r._id.d === 'pending') summary[r._id.b] = (summary[r._id.b] || 0) + r.n;
    summary.total += r.n;
  });
  const lastScan = await OverlapCandidate.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean();
  return { total, items: await enrichPairs(items), summary, scanned: Boolean(lastScan) };
}

async function getCandidate(pairKey) {
  const p = await OverlapCandidate.findOne({ pair_key: pairKey }).lean();
  return p ? (await enrichPairs([p]))[0] : null;
}

const DECISION_ROLES = ['bureau_head', 'bureau_officer', 'senior_management'];

/**
 * Record an official's decision. Atomic on the pending state, so two people cannot both decide.
 * Writes: the candidate's decision fields, one 'coordination' entry on each complaint's history,
 * and an audit-log entry. Nothing else about either complaint changes.
 */
async function decide(pairKey, { decision, reviewer_id: reviewerId, note }, { ip = null } = {}) {
  const err = (status, code, message) => Object.assign(new Error(message), { statusCode: status, code });
  const pair = await OverlapCandidate.findOne({ pair_key: pairKey }).lean();
  if (!pair) throw err(404, 'PAIR_NOT_FOUND', 'No possible-duplicate record found for these complaints');
  const reviewer = await User.findOne({ user_id: reviewerId, is_active: true }).lean();
  if (!reviewer) throw err(400, 'VALIDATION_ERROR', 'Choose the official recording this decision');
  if (!DECISION_ROLES.includes(reviewer.role)) throw err(403, 'NOT_PERMITTED', 'This official is not permitted to record duplicate-review decisions');
  const [a, b] = await Promise.all([Case.findOne({ case_id: pair.case_a }).lean(), Case.findOne({ case_id: pair.case_b }).lean()]);
  if (reviewer.bureau && ![a?.bureau, b?.bureau].includes(reviewer.bureau)) {
    throw err(403, 'NOT_PERMITTED', 'Only officials of the Bureaus handling these complaints, or senior management, can decide');
  }

  const now = new Date();
  const updated = await OverlapCandidate.findOneAndUpdate(
    { pair_key: pairKey, official_decision: 'pending' },
    { $set: { official_decision: decision, decided_by: reviewer.user_id, decided_at: now, decision_note: note, alert_active: false } },
    { new: true }
  ).lean();
  if (!updated) throw err(409, 'ALREADY_DECIDED', 'A decision has already been recorded for these complaints');

  const label = decision === 'confirmed_linked' ? 'Marked as related to' : 'Marked as unrelated to';
  const provenance = reviewer.provenance === 'SYNTHETIC' ? 'SYNTHETIC' : 'VERIFIED';
  const actions = [[pair.case_a, pair.case_b], [pair.case_b, pair.case_a]].map(([self, other]) => {
    const doc = { case_id: self, ts: now, actor: reviewer.user_id, action_type: 'coordination',
      remarks: `${label} complaint ${displayCaseId(other)} (duplicate review). Note: ${note}`, from_status: null, to_status: null, provenance };
    return { ...doc, action_key: crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex') };
  });
  await CaseAction.insertMany(actions);
  await AuditLog.create({
    actor: reviewer.user_id,
    action: 'duplicate_review_decision',
    entity_type: 'overlap_candidate',
    entity_id: pairKey,
    before_state: { official_decision: 'pending', score: pair.score, band: pair.band },
    after_state: { official_decision: decision, decision_note: note, decided_at: now },
    ip,
  });
  return getCandidate(pairKey);
}

/** Precision / recall against the labelled synthetic pairs (technical evaluation only). */
async function evaluate() {
  const { OverlapGroundTruth } = require('../models');
  const { pairs } = await computeCandidates();
  const flagged = new Set(pairs.filter((p) => p.band !== 'NONE').map((p) => p.pair_key));
  const truth = await OverlapGroundTruth.find({}).lean();
  let tp = 0; let fn = 0; let fp = 0; let tn = 0;
  truth.forEach((t) => {
    const key = pairKeyOf(t.case_a, t.case_b);
    const predicted = flagged.has(key);
    if (t.expected_cross_bureau_alert && predicted) tp += 1;
    else if (t.expected_cross_bureau_alert) fn += 1;
    else if (predicted) fp += 1;
    else tn += 1;
  });
  return { labelled_pairs: truth.length, tp, fp, fn, tn, precision: tp / Math.max(tp + fp, 1), recall: tp / Math.max(tp + fn, 1), flagged_total: flagged.size };
}

module.exports = { scanDuplicates, computeCandidates, listCandidates, getCandidate, decide, evaluate, pairKeyOf, displayCaseId, DECISION_ROLES, RULES_VERSION };
