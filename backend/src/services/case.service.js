const { Case, Institution, Bureau, User, CaseAction, Transfer } = require('../models');
const { escapeRegex } = require('../validators/query');
const config = require('../config/env');

/** Fields returned for case lists and details. Internal fields are excluded explicitly. */
const CASE_PROJECTION = { _id: 0, __v: 0, complainant_hash: 0 };
const INSTITUTION_SUMMARY = { _id: 0, institution_id: 1, aicte_permanent_id: 1, name: 1, district: 1, state: 1, region: 1, provenance: 1 };

function overdueBasis() {
  return {
    field: 'is_overdue',
    basis: 'dataset_snapshot',
    as_of: config.datasetSnapshotDate,
    note: 'Overdue flags come from the synthetic dataset snapshot; live recalculation is not implemented yet.',
  };
}

/** Resolve free-text search to institution IDs (name, AICTE permanent ID, institution ID). */
async function institutionIdsMatching(text) {
  const re = new RegExp(escapeRegex(text), 'i');
  const found = await Institution.find(
    { $or: [{ name: re }, { aicte_permanent_id: re }, { institution_id: re }] },
    { institution_id: 1 }
  ).lean();
  return found.map((i) => i.institution_id);
}

/**
 * Build the MongoDB filter for GET /cases from validated parameters.
 * Returns null when the filter can never match (e.g. unknown AICTE ID), so callers can short-circuit.
 */
async function buildCaseFilter(p) {
  const f = {};
  if (p.bureau) f.bureau = { $in: p.bureau };
  if (p.status) f.status = { $in: p.status };
  if (p.region) f.region = { $in: p.region };
  if (p.category) f.category = { $in: p.category };
  if (p.identity_status) f.identity_status = { $in: p.identity_status };
  if (p.is_overdue !== undefined) f.is_overdue = p.is_overdue;
  if (p.institution_id) f.institution_id = p.institution_id;
  if (p.aicte_permanent_id) {
    const inst = await Institution.findOne({ aicte_permanent_id: p.aicte_permanent_id }, { institution_id: 1 }).lean();
    if (!inst) return null;
    if (f.institution_id && f.institution_id !== inst.institution_id) return null;
    f.institution_id = inst.institution_id;
  }
  if (p.from || p.to) {
    f.receipt_date = {};
    if (p.from) f.receipt_date.$gte = p.from;
    if (p.to) f.receipt_date.$lt = new Date(p.to.getTime() + 24 * 3600 * 1000); // inclusive end date
  }
  if (p.q) {
    const re = new RegExp(escapeRegex(p.q), 'i');
    const instIds = await institutionIdsMatching(p.q);
    f.$or = [{ case_id: re }, { subject: re }, { description: re }, { refs: re }, { raw_institution_name: re }];
    if (instIds.length) f.$or.push({ institution_id: { $in: instIds } });
  }
  return f;
}

async function attachInstitutions(cases) {
  const ids = [...new Set(cases.map((c) => c.institution_id).filter(Boolean))];
  const insts = await Institution.find({ institution_id: { $in: ids } }, INSTITUTION_SUMMARY).lean();
  const byId = new Map(insts.map((i) => [i.institution_id, i]));
  return cases.map((c) => ({ ...c, institution: c.institution_id ? byId.get(c.institution_id) || null : null }));
}

async function provenanceCounts(filter) {
  const rows = await Case.aggregate([{ $match: filter }, { $group: { _id: '$provenance', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

async function listCases(p) {
  const { page, limit, sort } = p;
  const filter = await buildCaseFilter(p);
  if (filter === null) {
    return { items: [], total: 0, provenance: {} };
  }
  const [total, items, provenance] = await Promise.all([
    Case.countDocuments(filter),
    Case.find(filter, CASE_PROJECTION)
      .sort({ ...sort, case_id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    provenanceCounts(filter),
  ]);
  return { items: await attachInstitutions(items), total, provenance };
}

async function getCase(caseId) {
  const c = await Case.findOne({ case_id: caseId }, CASE_PROJECTION).lean();
  if (!c) return null;
  const [institution, bureau, actions, transfers] = await Promise.all([
    c.institution_id ? Institution.findOne({ institution_id: c.institution_id }, { _id: 0, __v: 0 }).lean() : null,
    Bureau.findOne({ code: c.bureau }, { _id: 0, code: 1, name: 1, sla_days_default: 1, provenance: 1 }).lean(),
    CaseAction.find({ case_id: caseId }, { _id: 0, __v: 0, action_key: 0, createdAt: 0, updatedAt: 0 }).sort({ ts: 1, action_type: 1 }).lean(),
    Transfer.find({ case_id: caseId }, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).sort({ requested_at: 1 }).lean(),
  ]);
  const userIds = [...new Set([c.assigned_officer, ...actions.map((a) => a.actor), ...transfers.flatMap((t) => [t.requested_by, t.accepted_by])].filter(Boolean))];
  const users = await User.find({ user_id: { $in: userIds } }, { _id: 0, user_id: 1, display_name: 1, role: 1, bureau: 1, provenance: 1 }).lean();
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const name = (id) => (id === 'system' ? 'System (automated)' : userById.get(id)?.display_name || null);
  return {
    ...c,
    institution,
    bureau_info: bureau,
    assigned_officer_info: c.assigned_officer ? userById.get(c.assigned_officer) || null : null,
    actions: actions.map((a) => ({ ...a, actor_name: name(a.actor) })),
    transfers: transfers.map((t) => ({ ...t, requested_by_name: name(t.requested_by), accepted_by_name: name(t.accepted_by) })),
  };
}

module.exports = { listCases, getCase, buildCaseFilter, overdueBasis, CASE_PROJECTION, attachInstitutions };
