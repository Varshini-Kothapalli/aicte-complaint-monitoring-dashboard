/**
 * Display helpers. Dates from the API are UTC; date-only values (receipt, disposal) are shown in UTC
 * so they never shift by a day in the viewer's timezone.
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

/** "fee_regulation_compliance" -> "Fee regulation compliance" */
export function humanize(value) {
  if (!value) return '—';
  const s = String(value).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const BUREAUS = [
  { code: 'PGRC', name: 'Public Grievance Redressal Cell' },
  { code: 'RB', name: 'Regulation Bureau' },
  { code: 'AB', name: 'Approval Bureau' },
];
export const STATUSES = ['Received', 'Assigned', 'Under Process', 'Action Initiated', 'Disposed'];
export const REGIONS = ['Central', 'Eastern', 'North-East', 'North-West', 'Northern', 'South', 'South-Central', 'South-West', 'West'];
export const STREAMS = ['Architecture', 'Diploma', 'Engineering', 'Management', 'Pharmacy'];
export const CATEGORIES = [
  'admission_irregularity', 'approval_condition_noncompliance', 'approval_deficiency', 'certificate_withheld',
  'faculty_norms_compliance', 'faculty_profile_misuse', 'fake_faculty', 'fee_refund', 'fee_regulation_compliance',
  'harassment_or_misconduct', 'infrastructure_deficiency', 'infrastructure_norms', 'intake_violation',
  'salary_non_payment', 'unapproved_course',
];

/* ---------------------------------------------------------------------------------------------
 * Display-only helpers. Stored identifiers and status values are never changed; these functions
 * only decide how they are shown to officials.
 * ------------------------------------------------------------------------------------------- */

/** Administrative names for stored status values. */
export const STATUS_LABELS = {
  Received: 'Received',
  Assigned: 'Assigned',
  'Under Process': 'Under Process',
  'Action Initiated': 'Action Started',
  Disposed: 'Resolved',
};
export const statusLabel = (s) => STATUS_LABELS[s] || s || '—';

/** "SYN-PGRC-2026-0001" -> "PGRC/2026/0001". Unknown formats are shown unchanged. */
export function displayCaseId(id) {
  if (!id) return '—';
  const m = /^(?:SYN-)?([A-Z]{2,5})-(\d{4})-(\d+)$/.exec(id);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : id;
}

/** "SYN-INST-0001" -> "INST-0001". */
export function displayInstitutionId(id) {
  if (!id) return '—';
  return id.replace(/^SYN-/, '');
}

/**
 * AICTE Permanent ID to show, or null. Only institutions whose record is VERIFIED against an
 * authoritative source may show one; demonstration IDs are never presented as official.
 */
export function verifiedAicteId(inst) {
  return inst && inst.provenance === 'VERIFIED' && inst.aicte_permanent_id ? inst.aicte_permanent_id : null;
}

/** { name, designation } from the API -> "Name" (+ designation on a second line where used). */
export function officerName(display, fallback = 'Not yet assigned') {
  return display?.name || fallback;
}

/**
 * Make free text written by the system readable: internal case, institution and user IDs and the
 * demonstration prefix on reference numbers are replaced with their on-screen forms.
 * `nameOf(userId)` returns a display name or null.
 */
export function readableText(text, nameOf = () => null) {
  if (!text) return text;
  return String(text)
    .replace(/\bSYN-USR-[A-Z0-9-]+\b/g, (id) => nameOf(id) || id.replace(/^SYN-USR-/, 'User '))
    .replace(/\bSYN-([A-Z]{2,5})-(\d{4})-(\d+)\b/g, '$1/$2/$3')
    .replace(/\bSYN-INST-(\d+)\b/g, 'INST-$1')
    .replace(/\bSYN\//g, '');
}

/** Whole days between two dates (UTC calendar days). */
export function daysBetween(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / 86400000);
}

export const formatNumber = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));

export function formatMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
