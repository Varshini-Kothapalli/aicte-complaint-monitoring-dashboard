const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { BUREAU_CODES, PROVENANCE } = require('./constants');

/** Bureau / Cell master. SLA days in the fixtures are synthetic demo configuration, not AICTE timelines. */
const BureauSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, enum: BUREAU_CODES },
    name: { type: String, required: true, trim: true },
    sla_days_default: { type: Number, required: true, min: 1, max: 365 },
    note: { type: String, default: null },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'bureaus' }
);

BureauSchema.plugin(importMeta);

module.exports = mongoose.models.Bureau || mongoose.model('Bureau', BureauSchema);
