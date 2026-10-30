/**
 * Administrative reports, computed from MongoDB at request time (nothing pre-written).
 * Each report returns { id, title, description, columns, rows, notes } and can be exported as CSV.
 * Status names use the administrative labels shown in the UI; stored values are unchanged.
 */
const config = require('../config/env');
const { personaFor } = require('../config/demoPersonas');
const { Case, Institution, Transfer, OverlapCandidate, CaseAction, User, Bureau } = require('../models');
const { CASE_STATUS, PENDING_STATUS, IN_PROGRESS_STATUS } = require('../models/constants');

const STATUS_LABEL = { Received: 'Received', Assigned: 'Assigned', 'Under Process': 'Under Process', 'Action Initiated': 'Action Started', Disposed: 'Resolved' };
const DAY = 24 * 3600 * 1000;
const displayCaseId = (id) => id.replace(/^SYN-/, '').replace(/-(\d{4})-/, '/$1/');
const displayInstId = (id) => (id ? id.replace(/^SYN-/, '') : '');
const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function receiptFilter({ from, to }) {
  if (!from && !to) return {};
  const r = {};
  if (from) r.$gte = from;
  if (to) r.$lt = new Date(to.getTime() + DAY);
  return { receipt_date: r };
}

async function userLabels(ids) {
  const users = await User.find({ user_id: { $in: [...new Set(ids.filter(Boolean))] } }, { _id: 0, user_id: 1, display_name: 1, provenance: 1 }).lean();
  const byId = new Map(users.map((u) => [u.user_id, u]));
  return (id) => {
    if (!id) return '';
    const p = personaFor(id, byId.get(id));
    return p.designation ? `${p.name} (${p.designation})` : p.name;
  };
}

const groupCount = (statuses) => ({ $sum: { $cond: [{ $in: ['$status', statuses] }, 1, 0] } });

async function bureauReport(params) {
  const match = receiptFilter(params);
  const [rows, bureaus, resolveTimes, transfersIn] = await Promise.all([
    Case.aggregate([
      { $match: match },
      { $group: { _id: '$bureau', total: { $sum: 1 }, pending: groupCount(PENDING_STATUS), in_progress: groupCount(IN_PROGRESS_STATUS),
        resolved: groupCount(['Disposed']), overdue: { $sum: { $cond: ['$is_overdue', 1, 0] } } } },
    ]),
    Bureau.find({}, { _id: 0, code: 1, name: 1 }).lean(),
    // Average days from receipt to the action that moved the complaint to Disposed.
    CaseAction.aggregate([
      { $match: { to_status: 'Disposed' } },
      { $lookup: { from: 'cases', localField: 'case_id', foreignField: 'case_id', as: 'c' } },
      { $unwind: '$c' },
      { $match: Object.fromEntries(Object.entries(match).map(([k, v]) => [`c.${k}`, v])) },
      { $group: { _id: '$c.bureau', avg: { $avg: { $divide: [{ $subtract: ['$ts', '$c.receipt_date'] }, DAY] } } } },
    ]),
    Transfer.aggregate([{ $group: { _id: '$to_bureau', n: { $sum: 1 } } }]),
  ]);
  const by = (arr, k = '_id') => new Map(arr.map((r) => [r[k], r]));
  const r = by(rows); const t = by(resolveTimes); const tin = by(transfersIn);
  return {
    columns: [
      { key: 'bureau', label: 'Bureau / Cell' }, { key: 'total', label: 'Total complaints' }, { key: 'pending', label: 'Pending' },
      { key: 'in_progress', label: 'In progress' }, { key: 'resolved', label: 'Resolved' }, { key: 'overdue', label: 'Overdue' },
      { key: 'transferred_in', label: 'Received by transfer' }, { key: 'avg_days_to_resolve', label: 'Average days to resolve' },
    ],
    rows: bureaus.map((b) => ({
      bureau: `${b.name} (${b.code})`,
      total: r.get(b.code)?.total || 0,
      pending: r.get(b.code)?.pending || 0,
      in_progress: r.get(b.code)?.in_progress || 0,
      resolved: r.get(b.code)?.resolved || 0,
      overdue: r.get(b.code)?.overdue || 0,
      transferred_in: tin.get(b.code)?.n || 0,
      avg_days_to_resolve: t.get(b.code) ? Math.round(t.get(b.code).avg) : '',
    })),
    notes: ['"Received by transfer" counts all recorded transfers into the Bureau (not limited by the date range).'],
  };
}

async function institutionReport(params) {
  const rows = await Case.aggregate([
    { $match: { institution_id: { $ne: null }, ...receiptFilter(params) } },
    { $group: { _id: '$institution_id', total: { $sum: 1 }, pending: groupCount(PENDING_STATUS), in_progress: groupCount(IN_PROGRESS_STATUS),
      resolved: groupCount(['Disposed']), overdue: { $sum: { $cond: ['$is_overdue', 1, 0] } }, bureaus: { $addToSet: '$bureau' } } },
    { $sort: { total: -1, _id: 1 } },
  ]);
  const insts = new Map((await Institution.find({}, { _id: 0, institution_id: 1, name: 1, district: 1, state: 1 }).lean()).map((i) => [i.institution_id, i]));
  const unlinked = await Case.countDocuments({ institution_id: null, ...receiptFilter(params) });
  return {
    columns: [
      { key: 'institution', label: 'Institution' }, { key: 'institution_ref', label: 'Institution ref.' }, { key: 'location', label: 'Location' },
      { key: 'total', label: 'Total complaints' }, { key: 'pending', label: 'Pending' }, { key: 'in_progress', label: 'In progress' },
      { key: 'resolved', label: 'Resolved' }, { key: 'overdue', label: 'Overdue' }, { key: 'bureaus', label: 'Bureaus involved' },
    ],
    rows: rows.map((r) => {
      const i = insts.get(r._id) || {};
      return { institution: i.name || r._id, institution_ref: displayInstId(r._id), location: i.district ? `${i.district}, ${i.state}` : '',
        total: r.total, pending: r.pending, in_progress: r.in_progress, resolved: r.resolved, overdue: r.overdue, bureaus: r.bureaus.sort().join(', ') };
    }),
    notes: unlinked ? [`${unlinked} complaint(s) are not included because their institution has not yet been verified.`] : [],
  };
}

async function statusReport(params) {
  const [rows, bureaus] = await Promise.all([
    Case.aggregate([{ $match: receiptFilter(params) }, { $group: { _id: { s: '$status', b: '$bureau' }, n: { $sum: 1 } } }]),
    Bureau.find({}, { _id: 0, code: 1 }).lean(),
  ]);
  const codes = bureaus.map((b) => b.code);
  const cell = (s, b) => rows.filter((r) => r._id.s === s && (!b || r._id.b === b)).reduce((x, r) => x + r.n, 0);
  const grand = rows.reduce((x, r) => x + r.n, 0);
  const line = (label, statuses, group) => {
    const o = { status: label, group };
    codes.forEach((b) => { o[b] = statuses.reduce((x, s) => x + cell(s, b), 0); });
    o.total = statuses.reduce((x, s) => x + cell(s), 0);
    o.share = grand ? `${((o.total / grand) * 100).toFixed(1)}%` : '0%';
    return o;
  };
  return {
    columns: [{ key: 'status', label: 'Status' }, { key: 'group', label: 'Group' }, ...codes.map((c) => ({ key: c, label: c })),
      { key: 'total', label: 'Total' }, { key: 'share', label: 'Share' }],
    rows: [
      ...CASE_STATUS.map((s) => line(STATUS_LABEL[s], [s], PENDING_STATUS.includes(s) ? 'Pending' : IN_PROGRESS_STATUS.includes(s) ? 'In progress' : 'Resolved')),
      line('All pending', PENDING_STATUS, 'Subtotal'),
      line('All in progress', IN_PROGRESS_STATUS, 'Subtotal'),
      line('All resolved', ['Disposed'], 'Subtotal'),
      line('All complaints', CASE_STATUS, 'Total'),
    ],
    notes: ['Pending = Received or Assigned. In progress = Under Process or Action Started.'],
  };
}

async function overdueReport(params) {
  const asOf = new Date(`${config.datasetSnapshotDate}T00:00:00Z`);
  const cases = await Case.find({ is_overdue: true, ...receiptFilter(params) }, { _id: 0, case_id: 1, institution_id: 1, raw_institution_name: 1, bureau: 1,
    assigned_officer: 1, status: 1, expected_disposal_date: 1, next_action: 1 }).sort({ expected_disposal_date: 1, case_id: 1 }).lean();
  const [insts, label, escal] = await Promise.all([
    Institution.find({ institution_id: { $in: cases.map((c) => c.institution_id).filter(Boolean) } }, { _id: 0, institution_id: 1, name: 1 }).lean(),
    userLabels(cases.map((c) => c.assigned_officer)),
    CaseAction.aggregate([{ $match: { case_id: { $in: cases.map((c) => c.case_id) }, action_type: 'escalation' } }, { $sort: { ts: -1 } },
      { $group: { _id: '$case_id', ts: { $first: '$ts' } } }]),
  ]);
  const instName = new Map(insts.map((i) => [i.institution_id, i.name]));
  const escAt = new Map(escal.map((e) => [e._id, e.ts]));
  return {
    columns: [
      { key: 'case', label: 'Case ID' }, { key: 'institution', label: 'Institution' }, { key: 'bureau', label: 'Bureau' }, { key: 'status', label: 'Status' },
      { key: 'officer', label: 'Responsible officer' }, { key: 'target', label: 'Target resolution date' }, { key: 'days_overdue', label: 'Days overdue' },
      { key: 'next_action', label: 'Next action' }, { key: 'escalation_recorded', label: 'Escalation recorded on' },
    ],
    rows: cases.map((c) => ({
      case: displayCaseId(c.case_id), institution: instName.get(c.institution_id) || c.raw_institution_name || '', bureau: c.bureau,
      status: STATUS_LABEL[c.status], officer: label(c.assigned_officer), target: isoDate(c.expected_disposal_date),
      days_overdue: Math.max(0, Math.floor((asOf - c.expected_disposal_date) / DAY)), next_action: c.next_action || '', escalation_recorded: isoDate(escAt.get(c.case_id)),
    })),
    notes: [`Days overdue are counted to ${config.datasetSnapshotDate}, the date of the demonstration dataset.`],
  };
}

async function transferReport() {
  const transfers = await Transfer.find({}, { _id: 0 }).sort({ requested_at: -1 }).lean();
  const [label, cases] = await Promise.all([
    userLabels(transfers.flatMap((t) => [t.requested_by, t.accepted_by])),
    Case.find({ case_id: { $in: transfers.map((t) => t.case_id) } }, { _id: 0, case_id: 1, institution_id: 1 }).lean(),
  ]);
  const insts = new Map((await Institution.find({ institution_id: { $in: cases.map((c) => c.institution_id) } }, { _id: 0, institution_id: 1, name: 1 }).lean())
    .map((i) => [i.institution_id, i.name]));
  const instOf = new Map(cases.map((c) => [c.case_id, insts.get(c.institution_id) || '']));
  return {
    columns: [
      { key: 'case', label: 'Case ID' }, { key: 'institution', label: 'Institution' }, { key: 'from', label: 'From Bureau' }, { key: 'to', label: 'To Bureau' },
      { key: 'reason', label: 'Reason' }, { key: 'requested', label: 'Requested on' }, { key: 'requested_by', label: 'Requested by' },
      { key: 'accepted', label: 'Accepted on' }, { key: 'accepted_by', label: 'Accepted by' }, { key: 'days', label: 'Days to accept' }, { key: 'state', label: 'State' },
    ],
    rows: transfers.map((t) => ({
      case: displayCaseId(t.case_id), institution: instOf.get(t.case_id), from: t.from_bureau, to: t.to_bureau, reason: t.reason,
      requested: isoDate(t.requested_at), requested_by: label(t.requested_by), accepted: isoDate(t.accepted_at), accepted_by: label(t.accepted_by),
      days: t.accepted_at ? Math.round((t.accepted_at - t.requested_at) / DAY) : '', state: t.state.charAt(0).toUpperCase() + t.state.slice(1),
    })),
    notes: [],
  };
}

async function duplicateReport() {
  const scanned = await OverlapCandidate.estimatedDocumentCount();
  if (!scanned) {
    return { columns: [{ key: 'item', label: 'Item' }, { key: 'value', label: 'Value' }], rows: [],
      notes: ['The duplicate review scan has not been run yet (npm run duplicates:scan). No results to report.'] };
  }
  const rows = await OverlapCandidate.aggregate([
    { $match: { $or: [{ alert_active: true }, { official_decision: { $ne: 'pending' } }] } },
    { $group: { _id: { d: '$official_decision', b: '$band' }, n: { $sum: 1 } } },
  ]);
  const label = { pending: 'Awaiting review', confirmed_linked: 'Confirmed related', dismissed_unrelated: 'Marked unrelated' };
  const n = (d, b) => rows.filter((r) => r._id.d === d && (!b || r._id.b === b)).reduce((x, r) => x + r.n, 0);
  const byInst = await OverlapCandidate.aggregate([
    { $match: { $or: [{ alert_active: true }, { official_decision: { $ne: 'pending' } }] } },
    { $group: { _id: '$institution_id', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 },
  ]);
  return {
    columns: [{ key: 'review_status', label: 'Review status' }, { key: 'high', label: 'Strong match' }, { key: 'medium', label: 'Possible match' }, { key: 'total', label: 'Total pairs' }],
    rows: ['pending', 'confirmed_linked', 'dismissed_unrelated'].map((d) => ({ review_status: label[d], high: n(d, 'HIGH'), medium: n(d, 'MEDIUM'), total: n(d) })),
    notes: [
      'Pairs are produced by the rule-based duplicate review (rules-v1) and only flag complaints for an official to check.',
      byInst.length ? `Institutions with flagged pairs: ${(await OverlapCandidate.distinct('institution_id')).length}.` : '',
    ].filter(Boolean),
  };
}

const REPORTS = {
  bureau: { title: 'Bureau-wise Complaint Report', description: 'Complaints handled by each Bureau / Cell, by stage, with overdue counts.', build: bureauReport, dated: true },
  institution: { title: 'Institution-wise Complaint Report', description: 'Every institution with its complaints across all Bureaus.', build: institutionReport, dated: true },
  status: { title: 'Pending and Resolved Report', description: 'Complaints by status for each Bureau.', build: statusReport, dated: true },
  overdue: { title: 'Overdue Complaint Report', description: 'Complaints past their target resolution date, with the responsible officer.', build: overdueReport, dated: true },
  transfers: { title: 'Inter-Bureau Transfer Report', description: 'Complaints moved from one Bureau to another, with reasons and timings.', build: transferReport, dated: false },
  duplicates: { title: 'Duplicate Complaint Analysis', description: 'Possible duplicate complaints flagged for review and the decisions recorded.', build: duplicateReport, dated: false },
};

async function buildReport(id, params = {}) {
  const def = REPORTS[id];
  if (!def) return null;
  const data = await def.build(params);
  return { id, title: def.title, description: def.description, generated_at: new Date().toISOString(), date_range: def.dated ? { from: isoDate(params.from), to: isoDate(params.to) } : null, ...data };
}

function toCsv(report) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+@]|^-[^\d]/.test(s)) s = `'${s}`; // stop spreadsheets treating text as a formula
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [report.columns.map((c) => esc(c.label)).join(','), ...report.rows.map((r) => report.columns.map((c) => esc(r[c.key])).join(','))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

const listReports = () => Object.entries(REPORTS).map(([id, r]) => ({ id, title: r.title, description: r.description, supports_date_range: r.dated }));

module.exports = { buildReport, listReports, toCsv, STATUS_LABEL };
