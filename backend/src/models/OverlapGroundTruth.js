const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { BUREAU_CODES, PAIR_RELATIONS, BANDS, CASE_CATEGORIES, PROVENANCE } = require('./constants');

/**
 * Labelled case pairs used ONLY to evaluate Engine D2 (precision / recall).
 * The engine must never read this collection while scoring.
 */
const OverlapGroundTruthSchema = new mongoose.Schema(
  {
    pair_id: { type: String, required: true, unique: true },
    case_a: { type: String, required: true, ref: 'Case', index: true },
    case_b: { type: String, required: true, ref: 'Case', index: true },
    institution_id: { type: String, required: true, ref: 'Institution', index: true },
    bureau_a: { type: String, required: true, enum: BUREAU_CODES },
    bureau_b: { type: String, required: true, enum: BUREAU_CODES },
    category_a: { type: String, required: true, enum: CASE_CATEGORIES },
    category_b: { type: String, required: true, enum: CASE_CATEGORIES },
    relation: { type: String, required: true, enum: PAIR_RELATIONS },
    shares_reference: { type: Boolean, required: true },
    cross_bureau: { type: Boolean, required: true },
    both_active: { type: Boolean, required: true },
    expected_min_band: { type: String, required: true, enum: BANDS },
    expected_cross_bureau_alert: { type: Boolean, required: true },
    design_note: { type: String, default: null },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'overlap_ground_truth' }
);

OverlapGroundTruthSchema.index({ case_a: 1, case_b: 1 }, { unique: true });
OverlapGroundTruthSchema.plugin(importMeta);

module.exports = mongoose.models.OverlapGroundTruth || mongoose.model('OverlapGroundTruth', OverlapGroundTruthSchema);
