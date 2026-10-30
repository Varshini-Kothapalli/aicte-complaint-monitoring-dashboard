/**
 * Read-only aggregations for the Complaint Monitoring Dashboard and the
 * Pending Actions & Overdue Complaints page. Every number is computed from MongoDB.
 *
 * "Today" for day counts is the dataset snapshot date (config.datasetSnapshotDate), because the
 * stored is_overdue flags were computed for that date. Using the real clock would contradict them.
 */
const config = require('../config/env');
const { personaFor } = require('../config/demoPersonas');
const { Case, Institution, OverlapCandidate, CaseAction, User, Bureau } = require('../models');
const { ACTIVE_CASE_STATUS, PENDING_STATUS, IN_PROGRESS_STATUS, CASE_STATUS, REGIONS } = require('../models/constants');
const { attachInstitutions } = require('./case.service');

const DAY = 24 * 3600 * 1000;
const asOfDate = () => new Date(`${config.datasetSnapshotDate}T00:00:00Z`);
const daysBetween = (from, to) => Math.floor((to - from) / DAY);

function referenceDate() {
  return { as_of: config.datasetSnapshotDate, basis: 'dataset_snapshot', note: 'Day counts use the demonstration dataset date, not today\'s date.' };
}

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));

async function summary() {
  const [statusRows, bureauRows, regionRows, monthRows, overdue, institutions, dup, bureaus, bureauStatusRows] = await Promise.all([
    Case.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Case.aggregate([{ $group: { _id: '$bureau', n: { $sum: 1 } } }]),
    Case.aggregate([{ $group: { _id: { $ifNull: ['$region', 'Not yet linked'] }, n: { $sum: 1 } } }]),
    Case.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$receipt_date' } }, received: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Disposed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Case.countDocuments({ is_overdue: true }),
    Institution.countDocuments({}),
    OverlapCandidate.aggregate([
      { $match: { official_decision: 'pending', alert_active: true } },
      { $group: { _id: '$band', n: { $sum: 1 } } },
    ]),
    Bureau.find({}, { _id: 0, code: 1, name: 1 }).lean(),
    Case.aggregate([{ $group: { _id: { b: '$bureau', s: '$status' }, n: { $sum: 1 }, overdue: { $sum: { $cond: ['$is_overdue', 1, 0] } } } }]),
  ]);
  const byStatus = countBy(statusRows);
  const sum = (list) => list.reduce((s, k) => s + (byStatus[k] || 0), 0);
  const total = sum(CASE_STATUS);
  const dupByBand = countBy(dup);
  const anyScan = await OverlapCandidate.estimatedDocumentCount();

  const byBureau = bureaus.map((b) => {
    const rows = bureauStatusRows.filter((r) => r._id.b === b.code);
    const n = (statuses) => rows.filter((r) => statuses.includes(r._id.s)).reduce((s, r) => s + r.n, 0);
    return { bureau: b.code, name: b.name, total: n(CASE_STATUS), pending: n(PENDING_STATUS), in_progress: n(IN_PROGRESS_STATUS),
      resolved: n(['Disposed']), overdue: rows.reduce((s, r) => s + r.overdue, 0) };
  });

  return {
    totals: {
      total,
      pending: sum(PENDING_STATUS),
      in_progress: sum(IN_PROGRESS_STATUS),
      resolved: byStatus.Disposed || 0,
      overdue,
      institutions,
      possible_duplicates: anyScan ? (dupByBand.HIGH || 0) + (dupByBand.MEDIUM || 0) : null,
    },
    status_groups: { pending: PENDING_STATUS, in_progress: IN_PROGRESS_STATUS, resolved: ['Disposed'] },
    by_status: CASE_STATUS.map((s) => ({ status: s, count: byStatus[s] || 0 })),
    by_bureau: byBureau,
    by_region: [...REGIONS, 'Not yet linked'].map((r) => ({ region: r, count: countBy(regionRows)[r] || 0 })).filter((r) => r.count > 0 || r.region !== 'Not yet linked'),
    monthly: monthRows.map((r) => ({ month: r._id, received: r.received, resolved: r.resolved })),
    duplicates: { scanned: Boolean(anyScan), pending_high: dupByBand.HIGH || 0, pending_medium: dupByBand.MEDIUM || 0 },
    reference: referenceDate(),
  };
}

/** Recommended escalation for an overdue complaint (display only, nothing is sent). */
function recommendedEscalation(daysOverdue) {
  if (daysOverdue > 21) return 'Regional officer and senior management';
  if (daysOverdue > 7) return 'Bureau head';
  return null;
}

async function withOfficersAndEscalations(cases) {
  const enriched = await attachInstitutions(cases);
  const ids = cases.map((c) => c.case_id);
  const escalations = await CaseAction.aggregate([
    { $match: { case_id: { $in: ids }, action_type: 'escalation' } },
    { $sort: { ts: -1 } },
    { $group: { _id: '$case_id', ts: { $first: '$ts' }, remarks: { $first: '$remarks' }, count: { $sum: 1 } } },
  ]);
  const escById = new Map(escalations.map((e) => [e._id, e]));
  const asOf = asOfDate();
  return enriched.map((c) => {
    const due = new Date(c.expected_disposal_date);
    const days = daysBetween(due, asOf);
    const esc = escById.get(c.case_id);
    return {
      ...c,
      days_overdue: c.is_overdue ? Math.max(days, 0) : 0,
      days_until_due: c.is_overdue ? 0 : Math.max(-days, 0),
      recorded_escalation: esc ? { at: esc.ts, remarks: esc.remarks, count: esc.count } : null,
      recommended_escalation: c.is_overdue ? recommendedEscalation(Math.max(days, 0)) : null,
    };
  });
}

/**
 * Lists for the Pending Actions page.
 *   section=overdue   active complaints flagged overdue, longest overdue first
 *   section=due_soon  active, not overdue, target date within `days` (default 7) of the reference date
 *   section=unassigned complaints still waiting for an officer
 */
async function attention({ section, days = 7, page, limit, bureau }) {
  const asOf = asOfDate();
  const base = { status: { $in: ACTIVE_CASE_STATUS } };
  if (bureau) base.bureau = { $in: bureau };
  let filter;
  let sort;
  if (section === 'overdue') {
    filter = { ...base, is_overdue: true };
    sort = { expected_disposal_date: 1 };
  } else if (section === 'due_soon') {
    filter = { ...base, is_overdue: false, expected_disposal_date: { $gte: asOf, $lt: new Date(asOf.getTime() + (days + 1) * DAY) } };
    sort = { expected_disposal_date: 1 };
  } else {
    filter = { ...base, status: 'Received' };
    sort = { receipt_date: 1 };
  }
  const projection = { _id: 0, __v: 0, complainant_hash: 0 };
  const [total, items, counts] = await Promise.all([
    Case.countDocuments(filter),
    Case.find(filter, projection).sort({ ...sort, case_id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Promise.all([
      Case.countDocuments({ ...base, is_overdue: true }),
      Case.countDocuments({ ...base, is_overdue: false, expected_disposal_date: { $gte: asOf, $lt: new Date(asOf.getTime() + (days + 1) * DAY) } }),
      Case.countDocuments({ ...base, status: 'Received' }),
      Case.countDocuments({ ...base, is_overdue: true, expected_disposal_date: { $lt: new Date(asOf.getTime() - 7 * DAY) } }),
    ]),
  ]);
  return {
    total,
    items: await withOfficersAndEscalations(items),
    counts: { overdue: counts[0], due_soon: counts[1], unassigned: counts[2], escalation_recommended: counts[3] },
    reference: referenceDate(),
  };
}

async function recentComplaints(limit = 6) {
  const items = await Case.find({}, { _id: 0, __v: 0, complainant_hash: 0 }).sort({ receipt_date: -1, case_id: -1 }).limit(limit).lean();
  return attachInstitutions(items);
}

/** Directory of officials for display and for choosing who records a review decision. */
async function listUsers({ roles } = {}) {
  const f = { is_active: true };
  if (roles) f.role = { $in: roles };
  const users = await User.find(f, { _id: 0, user_id: 1, role: 1, bureau: 1, region: 1, display_name: 1, provenance: 1 }).sort({ user_id: 1 }).lean();
  return users.map((u) => {
    const p = personaFor(u.user_id, u);
    return { user_id: u.user_id, name: p.name, designation: p.designation, fictional: p.fictional, role: u.role, bureau: u.bureau, region: u.region };
  });
}

module.exports = { summary, attention, recentComplaints, listUsers, referenceDate, recommendedEscalation };
