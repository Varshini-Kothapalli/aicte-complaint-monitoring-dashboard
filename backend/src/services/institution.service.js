const { Institution, Case } = require('../models');
const { ACTIVE_CASE_STATUS, CASE_STATUS, PENDING_STATUS, IN_PROGRESS_STATUS } = require('../models/constants');
const { escapeRegex } = require('../validators/query');
const { CASE_PROJECTION } = require('./case.service');

const INSTITUTION_PROJECTION = { _id: 0, __v: 0 };

/**
 * Per-institution case statistics (DERIVED from the cases collection).
 * `active_bureaus` lists Bureaus currently holding at least one active case. More than one is a
 * coordination signal only; it does not mean the cases overlap (that is Engine D2's job, with
 * human review).
 */
async function caseStatsFor(institutionIds) {
  const rows = await Case.aggregate([
    { $match: { institution_id: { $in: institutionIds } } },
    {
      $group: {
        _id: '$institution_id',
        total_cases: { $sum: 1 },
        active_cases: { $sum: { $cond: [{ $in: ['$status', ACTIVE_CASE_STATUS] }, 1, 0] } },
        overdue_cases: { $sum: { $cond: ['$is_overdue', 1, 0] } },
        pending_cases: { $sum: { $cond: [{ $in: ['$status', PENDING_STATUS] }, 1, 0] } },
        in_progress_cases: { $sum: { $cond: [{ $in: ['$status', IN_PROGRESS_STATUS] }, 1, 0] } },
        resolved_cases: { $sum: { $cond: [{ $eq: ['$status', 'Disposed'] }, 1, 0] } },
        bureau_list: { $push: '$bureau' },
        active_bureau_list: { $addToSet: { $cond: [{ $in: ['$status', ACTIVE_CASE_STATUS] }, '$bureau', '$$REMOVE'] } },
      },
    },
  ]);
  const byId = new Map(rows.map((r) => [r._id, r]));
  return (id) => {
    const r = byId.get(id);
    const active = r ? r.active_bureau_list.sort() : [];
    return {
      total_cases: r ? r.total_cases : 0,
      active_cases: r ? r.active_cases : 0,
      overdue_cases: r ? r.overdue_cases : 0,
      pending_cases: r ? r.pending_cases : 0,
      in_progress_cases: r ? r.in_progress_cases : 0,
      resolved_cases: r ? r.resolved_cases : 0,
      cases_by_bureau: r ? r.bureau_list.reduce((acc, b) => ({ ...acc, [b]: (acc[b] || 0) + 1 }), {}) : {},
      active_bureaus: active,
      multiple_bureaus_active: active.length > 1,
      provenance: 'DERIVED',
    };
  };
}

/** How many institutions share each name (identity-resolution hint, e.g. the two PQR institutes). */
async function sameNameCounts(names) {
  const rows = await Institution.aggregate([{ $match: { name: { $in: names } } }, { $group: { _id: '$name', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

function buildInstitutionFilter(p) {
  const f = {};
  if (p.region) f.region = { $in: p.region };
  if (p.stream) f.stream = { $in: p.stream };
  if (p.ownership) f.ownership = { $in: p.ownership };
  if (p.state) f.state = new RegExp(`^${escapeRegex(p.state)}$`, 'i');
  if (p.q) {
    const re = new RegExp(escapeRegex(p.q), 'i');
    f.$or = [{ name: re }, { district: re }, { state: re }, { aicte_permanent_id: re }, { institution_id: re }];
  }
  return f;
}

async function listInstitutions(p) {
  const filter = buildInstitutionFilter(p);
  const { page, limit, sort } = p;
  const [total, items] = await Promise.all([
    Institution.countDocuments(filter),
    Institution.find(filter, INSTITUTION_PROJECTION).sort({ ...sort, institution_id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const stats = await caseStatsFor(items.map((i) => i.institution_id));
  const sameName = await sameNameCounts(items.map((i) => i.name));
  return {
    total,
    items: items.map((i) => ({
      ...i,
      case_summary: stats(i.institution_id),
      shares_name_with: Math.max(0, (sameName.get(i.name) || 1) - 1),
    })),
  };
}

async function getInstitution(institutionId) {
  const inst = await Institution.findOne({ institution_id: institutionId }, INSTITUTION_PROJECTION).lean();
  if (!inst) return null;

  const [cases, byBureau, sameName] = await Promise.all([
    Case.find({ institution_id: institutionId }, CASE_PROJECTION).sort({ receipt_date: -1, case_id: 1 }).lean(),
    Case.aggregate([
      { $match: { institution_id: institutionId } },
      { $group: { _id: { bureau: '$bureau', status: '$status' }, n: { $sum: 1 }, overdue: { $sum: { $cond: ['$is_overdue', 1, 0] } } } },
    ]),
    Institution.find({ name: inst.name, institution_id: { $ne: institutionId } }, { _id: 0, institution_id: 1, district: 1, state: 1 }).lean(),
  ]);

  const bureaus = {};
  for (const r of byBureau) {
    const b = (bureaus[r._id.bureau] ||= { bureau: r._id.bureau, total: 0, active: 0, overdue: 0, by_status: Object.fromEntries(CASE_STATUS.map((s) => [s, 0])) });
    b.total += r.n;
    b.overdue += r.overdue;
    b.by_status[r._id.status] += r.n;
    if (ACTIVE_CASE_STATUS.includes(r._id.status)) b.active += r.n;
  }
  const stats = (await caseStatsFor([institutionId]))(institutionId);

  return {
    ...inst,
    case_summary: { ...stats, by_bureau: Object.values(bureaus).sort((a, b) => a.bureau.localeCompare(b.bureau)) },
    same_name_institutions: sameName,
    cases,
  };
}

module.exports = { listInstitutions, getInstitution, buildInstitutionFilter };
