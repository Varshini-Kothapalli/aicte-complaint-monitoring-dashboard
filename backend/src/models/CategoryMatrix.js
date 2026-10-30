const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { BUREAU_CODES, CASE_CATEGORIES, PROVENANCE } = require('./constants');

/** Cross-Bureau related-category rules used by the (future) rule score in Engine D2. */
const CategoryMatrixSchema = new mongoose.Schema(
  {
    category_a: { type: String, required: true, enum: CASE_CATEGORIES },
    bureau_a: { type: String, required: true, enum: BUREAU_CODES },
    category_b: { type: String, required: true, enum: CASE_CATEGORIES },
    bureau_b: { type: String, required: true, enum: BUREAU_CODES },
    rule_points: { type: Number, required: true, min: 0, max: 1, default: 0.25 },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'category_matrix' }
);

CategoryMatrixSchema.index({ category_a: 1, category_b: 1 }, { unique: true });
CategoryMatrixSchema.plugin(importMeta);

module.exports = mongoose.models.CategoryMatrix || mongoose.model('CategoryMatrix', CategoryMatrixSchema);
