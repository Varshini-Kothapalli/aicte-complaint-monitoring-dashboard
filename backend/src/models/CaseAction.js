const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { ACTION_TYPES, CASE_STATUS, PROVENANCE } = require('./constants');

/**
 * Append-only chronological history of a case.
 * The source CSV has no action ID, so `action_key` is a SHA-256 of the full source row. It makes
 * re-imports idempotent and collapses exact duplicate rows (reported by the importer).
 */
const CaseActionSchema = new mongoose.Schema(
  {
    action_key: { type: String, required: true, unique: true },
    case_id: { type: String, required: true, ref: 'Case', index: true },
    ts: { type: Date, required: true, index: true },
    actor: { type: String, required: true, index: true }, // user_id or "system"
    action_type: { type: String, required: true, enum: ACTION_TYPES, index: true },
    remarks: { type: String, required: true },
    from_status: { type: String, enum: [...CASE_STATUS, null], default: null },
    to_status: { type: String, enum: [...CASE_STATUS, null], default: null },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'case_actions' }
);

CaseActionSchema.index({ case_id: 1, ts: 1 });
CaseActionSchema.plugin(importMeta);

module.exports = mongoose.models.CaseAction || mongoose.model('CaseAction', CaseActionSchema);
