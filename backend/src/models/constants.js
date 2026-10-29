/**
 * Shared enumerations used by models, the importer and API validators.
 * Values mirror docs/DATABASE_SCHEMA.md and the fixtures in data/processed/extracted/csv/.
 */

const PROVENANCE = ['VERIFIED', 'IMPORTED_UNVERIFIED', 'SYNTHETIC', 'DERIVED'];
const BUREAU_CODES = ['PGRC', 'RB', 'AB'];
const STREAMS = ['Engineering', 'Diploma', 'Management', 'Architecture', 'Pharmacy'];
const REGIONS = ['West', 'South-West', 'South', 'South-Central', 'Northern', 'North-West', 'Eastern', 'Central', 'North-East'];
const OWNERSHIP = ['Private-Self Financing', 'Government Aided', 'Government'];
const USER_ROLES = ['bureau_head', 'bureau_officer', 'regional_official', 'senior_management', 'admin'];
const IDENTITY_STATUS = ['VERIFIED', 'VERIFICATION_QUEUE', 'UNRESOLVED'];
const CASE_STATUS = ['Received', 'Assigned', 'Under Process', 'Action Initiated', 'Disposed'];
const ACTIVE_CASE_STATUS = CASE_STATUS.filter((s) => s !== 'Disposed');
const ACTION_TYPES = ['created', 'assigned', 'status_change', 'document', 'transfer', 'escalation'];
const TRANSFER_STATES = ['pending', 'accepted', 'rejected'];
const PAIR_RELATIONS = ['same_matter', 'different_matter', 'duplicate_submission'];
const BANDS = ['HIGH', 'MEDIUM', 'NONE'];
const CASE_CATEGORIES = [
  'admission_irregularity', 'approval_condition_noncompliance', 'approval_deficiency', 'certificate_withheld',
  'faculty_norms_compliance', 'faculty_profile_misuse', 'fake_faculty', 'fee_refund', 'fee_regulation_compliance',
  'harassment_or_misconduct', 'infrastructure_deficiency', 'infrastructure_norms', 'intake_violation',
  'salary_non_payment', 'unapproved_course',
];

/** The actor value used by automated escalations in case_actions. Not a user account. */
const SYSTEM_ACTOR = 'system';

module.exports = {
  PROVENANCE,
  BUREAU_CODES,
  STREAMS,
  REGIONS,
  OWNERSHIP,
  USER_ROLES,
  IDENTITY_STATUS,
  CASE_STATUS,
  ACTIVE_CASE_STATUS,
  ACTION_TYPES,
  TRANSFER_STATES,
  PAIR_RELATIONS,
  BANDS,
  CASE_CATEGORIES,
  SYSTEM_ACTOR,
};
