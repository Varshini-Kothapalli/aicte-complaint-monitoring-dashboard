const mongoose = require('mongoose');
const { BANDS } = require('./constants');

/**
 * Engine D2 output (DERIVED). Advisory only: a candidate never changes case status, ownership,
 * Bureau or regulatory action. Only an official's recorded decision creates a link.
 * Not populated in this phase.
 */
const OverlapCandidateSchema = new mongoose.Schema(
  {
    pair_key: { type: String, required: true, unique: true }, // sorted "caseA:caseB"
    case_a: { type: String, required: true, ref: 'Case', index: true },
    case_b: { type: String, required: true, ref: 'Case', index: true },
    institution_id: { type: String, required: true, ref: 'Institution', index: true },
    score: { type: Number, required: true, min: 0, max: 1 },
    band: { type: String, required: true, enum: BANDS },
    reasons: { type: [String], default: [] },
    alert_active: { type: Boolean, default: true, index: true },
    official_decision: { type: String, enum: ['pending', 'confirmed_linked', 'dismissed_unrelated'], default: 'pending' },
    decided_by: { type: String, default: null, ref: 'User' },
    decided_at: { type: Date, default: null },
    decision_note: { type: String, default: null },
    provenance: { type: String, enum: ['DERIVED'], default: 'DERIVED' },
  },
  { timestamps: true, collection: 'overlap_candidates' }
);

module.exports = mongoose.models.OverlapCandidate || mongoose.model('OverlapCandidate', OverlapCandidateSchema);
