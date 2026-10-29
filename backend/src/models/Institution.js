const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { STREAMS, REGIONS, OWNERSHIP, PROVENANCE } = require('./constants');

/** Master directory of institutions (synthetic fixtures in this prototype). */
const InstitutionSchema = new mongoose.Schema(
  {
    institution_id: { type: String, required: true, unique: true, trim: true },
    aicte_permanent_id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, index: true },
    stream: { type: String, required: true, enum: STREAMS, index: true },
    state: { type: String, required: true, trim: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    region: { type: String, required: true, enum: REGIONS, index: true },
    ownership: { type: String, required: true, enum: OWNERSHIP },
    established: { type: Number, required: true, min: 1800, max: 2100 },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'institutions' }
);

// Text index for name / location search (one text index per collection).
InstitutionSchema.index({ name: 'text', district: 'text', state: 'text' }, { name: 'institution_text' });
InstitutionSchema.plugin(importMeta);

module.exports = mongoose.models.Institution || mongoose.model('Institution', InstitutionSchema);
