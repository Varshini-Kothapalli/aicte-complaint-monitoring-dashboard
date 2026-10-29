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
