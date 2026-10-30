const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { IDENTITY_STATUS, PROVENANCE } = require('./constants');

/**
 * Raw institution references with the identity decision a correct Engine D1 must reach.
 * These are evaluation fixtures, not confirmed aliases: nothing here links a case to an institution.
 */
const InstAliasSchema = new mongoose.Schema(
  {
    alias_test_id: { type: String, required: true, unique: true, trim: true },
    raw_name: { type: String, required: true, index: true },
    raw_location: { type: String, default: null },
    expected_institution_id: { type: String, default: null, ref: 'Institution', index: true },
    expected_decision: { type: String, required: true, enum: IDENTITY_STATUS },
    case_note: { type: String, default: null },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'inst_aliases' }
);

InstAliasSchema.plugin(importMeta);

module.exports = mongoose.models.InstAlias || mongoose.model('InstAlias', InstAliasSchema);
