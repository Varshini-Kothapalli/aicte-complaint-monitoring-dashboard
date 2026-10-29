const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { BUREAU_CODES, CASE_STATUS, IDENTITY_STATUS, CASE_CATEGORIES, REGIONS, PROVENANCE } = require('./constants');

/**
 * Core case record. Every mandatory tracking field from the problem statement is here:
 * case ID, receipt date, category, status, Bureau, officer, last action, next action and
 * expected disposal date.
 *
 * Fields hidden from API responses (select: false):
 *  - complainant_ref: internal synthetic complainant key (only the hash is needed by the engine)
 *  - matter_id, design_note: generator ground-truth markers; must never reach the overlap engine or UI
 */
const CaseSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, unique: true, trim: true },
    // Required when identity is VERIFIED; must stay empty until then (uncertain identities are never linked).
    institution_id: {
      type: String,
      default: null,
      ref: 'Institution',
      index: true,
      required: [function needsInstitution() { return this.identity_status === 'VERIFIED'; }, 'institution_id is required when identity_status is VERIFIED'],
      validate: {
        validator: function onlyWhenVerified(v) { return !v || this.identity_status === 'VERIFIED'; },
        message: 'institution_id must be empty until the institution identity is VERIFIED',
      },
    },
    identity_status: { type: String, required: true, enum: IDENTITY_STATUS, default: 'VERIFIED', index: true },
    raw_institution_name: { type: String, default: null },
    receipt_date: { type: Date, required: true, index: true },
    category: { type: String, required: true, enum: CASE_CATEGORIES, index: true },
    bureau: { type: String, required: true, enum: BUREAU_CODES, index: true },
    assigned_officer: {
      type: String,
      default: null,
      ref: 'User',
      index: true,
      required: [function needsOfficer() { return this.status !== 'Received'; }, 'assigned_officer is required once a case is past "Received"'],
    },
    status: { type: String, required: true, enum: CASE_STATUS, default: 'Received', index: true },
    last_action: { type: String, default: null },
    last_action_at: { type: Date, default: null },
    next_action: { type: String, default: null },
    expected_disposal_date: { type: Date, required: true, index: true },
    // Snapshot flag from the dataset (computed as of the dataset's demo date). Live recomputation is
    // the SLA monitor's job (roadmap phase 6); the API reports which basis it is using.
    is_overdue: { type: Boolean, required: true, default: false, index: true },
    was_transferred: { type: Boolean, required: true, default: false },
    region: { type: String, enum: [...REGIONS, null], default: null, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    refs: { type: [String], default: [] },
    complainant_ref: { type: String, default: null, select: false },
    complainant_hash: { type: String, required: true, index: true },
    matter_id: { type: String, default: null, select: false },
    design_note: { type: String, default: null, select: false },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'cases' }
);

// Compound indexes for dashboard and explorer queries.
CaseSchema.index({ bureau: 1, status: 1, is_overdue: 1 });
CaseSchema.index({ institution_id: 1, receipt_date: -1 });
CaseSchema.index({ expected_disposal_date: 1, status: 1 });
CaseSchema.index({ region: 1, receipt_date: -1 });
CaseSchema.index({ refs: 1 });
CaseSchema.index({ subject: 'text', description: 'text' }, { name: 'case_text', weights: { subject: 3, description: 1 } });
CaseSchema.plugin(importMeta);

module.exports = mongoose.models.Case || mongoose.model('Case', CaseSchema);
