/**
 * Per-file import specifications for the synthetic monitoring fixtures, in dependency order.
 *
 * Each spec declares:
 *   file / model / keyField  - source CSV, target model and natural key
 *   columns                  - columns that must be present in the CSV header
 *   toDoc(row)               - strict normalisation (throws on bad values)
 *   checkRefs(doc, ctx)      - cross-record checks; returns a list of rejection reasons
 *   register(doc, ctx)       - records an accepted doc so later files can reference it
 *
 * The historical ACSS files (acss_clean.csv, acss_grievances.csv) are intentionally NOT imported
 * here: they have no institution, Bureau or status fields and must not be turned into cases.
 */
const n = require('./normalize');
const M = require('../models');
const { SYSTEM_ACTOR } = require('../models/constants');

const SYN_PREFIX = /^SYN-/;

function requireSynthetic(doc, idFields) {
  const reasons = [];
  if (doc.provenance !== 'SYNTHETIC') reasons.push(`provenance must be SYNTHETIC for this fixture (got "${doc.provenance}")`);
  for (const f of idFields) {
    if (doc[f] && !SYN_PREFIX.test(doc[f])) reasons.push(`${f} must start with "SYN-" for synthetic records`);
  }
  return reasons;
}

const dayStart = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const SPECS = [
  {
    name: 'bureaus',
    file: 'bureaus.csv',
    model: M.Bureau,
    keyField: 'code',
    columns: ['code', 'name', 'sla_days_default', 'provenance', 'note'],
    toDoc: (r) => ({
      code: n.requiredStr(r.code, 'code'),
      name: n.requiredStr(r.name, 'name'),
      sla_days_default: n.int(r.sla_days_default, 'sla_days_default'),
      note: n.str(r.note),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    checkRefs: (d) => requireSynthetic(d, []),
    register: (d, ctx) => ctx.bureaus.set(d.code, d),
  },
  {
    name: 'institutions',
    file: 'institutions.csv',
    model: M.Institution,
    keyField: 'institution_id',
    columns: ['institution_id', 'aicte_permanent_id', 'name', 'stream', 'state', 'district', 'region', 'ownership', 'established', 'provenance'],
    toDoc: (r) => ({
      institution_id: n.requiredStr(r.institution_id, 'institution_id'),
      aicte_permanent_id: n.requiredStr(r.aicte_permanent_id, 'aicte_permanent_id'),
      name: n.requiredStr(r.name, 'name'),
      stream: n.requiredStr(r.stream, 'stream'),
      state: n.requiredStr(r.state, 'state'),
      district: n.requiredStr(r.district, 'district'),
      region: n.requiredStr(r.region, 'region'),
      ownership: n.requiredStr(r.ownership, 'ownership'),
      established: n.int(r.established, 'established'),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    uniqueFields: ['aicte_permanent_id'],
    checkRefs: (d) => requireSynthetic(d, ['institution_id', 'aicte_permanent_id']),
    register: (d, ctx) => ctx.institutions.set(d.institution_id, d),
  },
  {
    name: 'users',
    file: 'users.csv',
    model: M.User,
    keyField: 'user_id',
    columns: ['user_id', 'display_name', 'role', 'bureau', 'region', 'email', 'provenance'],
    toDoc: (r) => ({
      user_id: n.requiredStr(r.user_id, 'user_id'),
      display_name: n.requiredStr(r.display_name, 'display_name'),
      role: n.requiredStr(r.role, 'role'),
      bureau: n.str(r.bureau),
      region: n.str(r.region),
      email: n.requiredStr(r.email, 'email').toLowerCase(),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    uniqueFields: ['email'],
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['user_id']);
      if (!/@demo\.invalid$/.test(d.email)) reasons.push('synthetic users must use an @demo.invalid e-mail');
      if (d.bureau && !ctx.bureaus.has(d.bureau)) reasons.push(`unknown bureau "${d.bureau}"`);
      if (['bureau_head', 'bureau_officer'].includes(d.role) && !d.bureau) reasons.push(`${d.role} needs a bureau`);
      if (d.role === 'regional_official' && !d.region) reasons.push('regional_official needs a region');
      return reasons;
    },
    register: (d, ctx) => ctx.users.set(d.user_id, d),
  },
  {
    name: 'category_matrix',
    file: 'category_matrix.csv',
    model: M.CategoryMatrix,
    keyField: 'rule_key',
    keyOf: (d) => `${d.category_a}|${d.category_b}`,
    keyFilter: (d) => ({ category_a: d.category_a, category_b: d.category_b }),
    columns: ['category_a', 'bureau_a', 'category_b', 'bureau_b', 'rule_points', 'provenance'],
    toDoc: (r) => ({
      category_a: n.requiredStr(r.category_a, 'category_a'),
      bureau_a: n.requiredStr(r.bureau_a, 'bureau_a'),
      category_b: n.requiredStr(r.category_b, 'category_b'),
      bureau_b: n.requiredStr(r.bureau_b, 'bureau_b'),
      rule_points: n.num(r.rule_points, 'rule_points'),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, []);
      for (const b of [d.bureau_a, d.bureau_b]) if (!ctx.bureaus.has(b)) reasons.push(`unknown bureau "${b}"`);
      if (d.bureau_a === d.bureau_b) reasons.push('a related-category rule must link two different Bureaus');
      return reasons;
    },
    register: () => {},
  },
  {
    name: 'inst_aliases',
    file: 'institution_alias_tests.csv',
    model: M.InstAlias,
    keyField: 'alias_test_id',
    columns: ['alias_test_id', 'raw_name', 'raw_location', 'expected_institution_id', 'expected_decision', 'case_note', 'provenance'],
    toDoc: (r) => ({
      alias_test_id: n.requiredStr(r.alias_test_id, 'alias_test_id'),
      raw_name: n.requiredStr(r.raw_name, 'raw_name'),
      raw_location: n.str(r.raw_location),
      expected_institution_id: n.str(r.expected_institution_id),
      expected_decision: n.requiredStr(r.expected_decision, 'expected_decision'),
      case_note: n.str(r.case_note),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['alias_test_id']);
      if (d.expected_decision === 'VERIFIED' && !d.expected_institution_id) {
        reasons.push('expected_decision VERIFIED needs expected_institution_id');
      }
      if (d.expected_decision !== 'VERIFIED' && d.expected_institution_id) {
        reasons.push(`expected_decision ${d.expected_decision} must not name an institution`);
      }
      if (d.expected_institution_id && !ctx.institutions.has(d.expected_institution_id)) {
        reasons.push(`unknown expected_institution_id "${d.expected_institution_id}"`);
      }
      return reasons;
    },
    register: () => {},
  },
  {
    name: 'cases',
    file: 'cases.csv',
    model: M.Case,
    keyField: 'case_id',
    columns: ['case_id', 'institution_id', 'identity_status', 'raw_institution_name', 'receipt_date', 'category', 'bureau',
      'assigned_officer', 'status', 'last_action', 'last_action_at', 'next_action', 'expected_disposal_date', 'is_overdue',
      'was_transferred', 'region', 'subject', 'description', 'refs', 'complainant_ref', 'complainant_hash', 'matter_id',
      'design_note', 'provenance'],
    toDoc: (r) => ({
      case_id: n.requiredStr(r.case_id, 'case_id'),
      institution_id: n.str(r.institution_id),
      identity_status: n.requiredStr(r.identity_status, 'identity_status'),
      raw_institution_name: n.str(r.raw_institution_name),
      receipt_date: n.date(r.receipt_date, 'receipt_date'),
      category: n.requiredStr(r.category, 'category'),
      bureau: n.requiredStr(r.bureau, 'bureau'),
      assigned_officer: n.str(r.assigned_officer),
      status: n.requiredStr(r.status, 'status'),
      last_action: n.str(r.last_action),
      last_action_at: n.date(r.last_action_at, 'last_action_at', { required: false }),
      next_action: n.str(r.next_action),
      expected_disposal_date: n.date(r.expected_disposal_date, 'expected_disposal_date'),
      is_overdue: n.bool(r.is_overdue, 'is_overdue'),
      was_transferred: n.bool(r.was_transferred, 'was_transferred'),
      region: n.str(r.region),
      subject: n.requiredStr(r.subject, 'subject'),
      description: n.requiredStr(r.description, 'description'),
      refs: n.list(r.refs),
      complainant_ref: n.str(r.complainant_ref),
      complainant_hash: n.requiredStr(r.complainant_hash, 'complainant_hash'),
      matter_id: n.str(r.matter_id),
      design_note: n.str(r.design_note),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['case_id', 'institution_id']);
      if (!ctx.bureaus.has(d.bureau)) reasons.push(`unknown bureau "${d.bureau}"`);
      if (d.institution_id) {
        const inst = ctx.institutions.get(d.institution_id);
        if (!inst) reasons.push(`unknown institution_id "${d.institution_id}"`);
        else if (d.region && inst.region !== d.region) reasons.push(`region "${d.region}" does not match institution region "${inst.region}"`);
      } else if (!d.raw_institution_name) {
        reasons.push('a case without a verified institution must keep raw_institution_name for review');
      }
      if (d.assigned_officer) {
        const u = ctx.users.get(d.assigned_officer);
        if (!u) reasons.push(`unknown assigned_officer "${d.assigned_officer}"`);
        else if (u.bureau !== d.bureau) reasons.push(`assigned_officer belongs to ${u.bureau || 'no bureau'}, case is ${d.bureau}`);
      }
      if (d.expected_disposal_date < d.receipt_date) reasons.push('expected_disposal_date is before receipt_date');
      if (d.is_overdue && d.status === 'Disposed') reasons.push('a Disposed case cannot be overdue');
      return reasons;
    },
    register: (d, ctx) => ctx.cases.set(d.case_id, d),
  },
  {
    name: 'case_actions',
    file: 'case_actions.csv',
    model: M.CaseAction,
    keyField: 'action_key',
    columns: ['case_id', 'ts', 'actor', 'action_type', 'remarks', 'from_status', 'to_status', 'provenance'],
    toDoc: (r) => {
      const d = {
        case_id: n.requiredStr(r.case_id, 'case_id'),
        ts: n.date(r.ts, 'ts'),
        actor: n.requiredStr(r.actor, 'actor'),
        action_type: n.requiredStr(r.action_type, 'action_type'),
        remarks: n.requiredStr(r.remarks, 'remarks'),
        from_status: n.str(r.from_status),
        to_status: n.str(r.to_status),
        provenance: n.requiredStr(r.provenance, 'provenance'),
      };
      d.action_key = n.hashObject(d); // natural key: identical rows collapse to one record
      return d;
    },
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['case_id']);
      const c = ctx.cases.get(d.case_id);
      if (!c) reasons.push(`unknown case_id "${d.case_id}"`);
      else if (dayStart(d.ts) < dayStart(c.receipt_date)) reasons.push('action is dated before the case receipt date');
      if (d.actor !== SYSTEM_ACTOR && !ctx.users.has(d.actor)) reasons.push(`unknown actor "${d.actor}"`);
      return reasons;
    },
    register: () => {},
  },
  {
    name: 'transfers',
    file: 'transfers.csv',
    model: M.Transfer,
    keyField: 'transfer_key',
    columns: ['case_id', 'from_bureau', 'to_bureau', 'reason', 'requested_by', 'requested_at', 'accepted_by', 'accepted_at', 'state', 'provenance'],
    toDoc: (r) => {
      const d = {
        case_id: n.requiredStr(r.case_id, 'case_id'),
        from_bureau: n.requiredStr(r.from_bureau, 'from_bureau'),
        to_bureau: n.requiredStr(r.to_bureau, 'to_bureau'),
        reason: n.requiredStr(r.reason, 'reason'),
        requested_by: n.requiredStr(r.requested_by, 'requested_by'),
        requested_at: n.date(r.requested_at, 'requested_at'),
        accepted_by: n.str(r.accepted_by),
        accepted_at: n.date(r.accepted_at, 'accepted_at', { required: false }),
        state: n.requiredStr(r.state, 'state'),
        provenance: n.requiredStr(r.provenance, 'provenance'),
      };
      d.transfer_key = `${d.case_id}@${d.requested_at.toISOString()}`;
      return d;
    },
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['case_id']);
      if (!ctx.cases.has(d.case_id)) reasons.push(`unknown case_id "${d.case_id}"`);
      for (const b of [d.from_bureau, d.to_bureau]) if (!ctx.bureaus.has(b)) reasons.push(`unknown bureau "${b}"`);
      for (const u of [d.requested_by, d.accepted_by]) if (u && !ctx.users.has(u)) reasons.push(`unknown user "${u}"`);
      if (d.accepted_at && d.accepted_at < d.requested_at) reasons.push('accepted_at is before requested_at');
      return reasons;
    },
    register: () => {},
  },
  {
    name: 'overlap_ground_truth',
    file: 'overlap_ground_truth.csv',
    model: M.OverlapGroundTruth,
    keyField: 'pair_id',
    columns: ['pair_id', 'case_a', 'case_b', 'institution_id', 'bureau_a', 'bureau_b', 'category_a', 'category_b', 'relation',
      'shares_reference', 'cross_bureau', 'both_active', 'expected_min_band', 'expected_cross_bureau_alert', 'design_note', 'provenance'],
    toDoc: (r) => ({
      pair_id: n.requiredStr(r.pair_id, 'pair_id'),
      case_a: n.requiredStr(r.case_a, 'case_a'),
      case_b: n.requiredStr(r.case_b, 'case_b'),
      institution_id: n.requiredStr(r.institution_id, 'institution_id'),
      bureau_a: n.requiredStr(r.bureau_a, 'bureau_a'),
      bureau_b: n.requiredStr(r.bureau_b, 'bureau_b'),
      category_a: n.requiredStr(r.category_a, 'category_a'),
      category_b: n.requiredStr(r.category_b, 'category_b'),
      relation: n.requiredStr(r.relation, 'relation'),
      shares_reference: n.bool(r.shares_reference, 'shares_reference'),
      cross_bureau: n.bool(r.cross_bureau, 'cross_bureau'),
      both_active: n.bool(r.both_active, 'both_active'),
      expected_min_band: n.requiredStr(r.expected_min_band, 'expected_min_band'),
      expected_cross_bureau_alert: n.bool(r.expected_cross_bureau_alert, 'expected_cross_bureau_alert'),
      design_note: n.str(r.design_note),
      provenance: n.requiredStr(r.provenance, 'provenance'),
    }),
    uniqueFields: ['pair'],
    pairKey: (d) => `${d.case_a}|${d.case_b}`,
    checkRefs: (d, ctx) => {
      const reasons = requireSynthetic(d, ['pair_id', 'case_a', 'case_b', 'institution_id']);
      if (d.case_a === d.case_b) reasons.push('case_a and case_b must differ');
      if (!ctx.institutions.has(d.institution_id)) reasons.push(`unknown institution_id "${d.institution_id}"`);
      for (const [side, id] of [['a', d.case_a], ['b', d.case_b]]) {
        const c = ctx.cases.get(id);
        if (!c) { reasons.push(`unknown case_${side} "${id}"`); continue; }
        if (c.institution_id !== d.institution_id) reasons.push(`case_${side} belongs to a different institution`);
        if (c.bureau !== d[`bureau_${side}`]) reasons.push(`bureau_${side} does not match case_${side}`);
        if (c.category !== d[`category_${side}`]) reasons.push(`category_${side} does not match case_${side}`);
      }
      return reasons;
    },
    register: () => {},
  },
];

module.exports = { SPECS };
