const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { BUREAU_CODES, TRANSFER_STATES, PROVENANCE } = require('./constants');

/**
 * Inter-Bureau case transfer. The CSV has no transfer ID; `transfer_key` is derived as
 * `<case_id>@<requested_at ISO>` which is unique in the fixtures and stable across imports.
 */
const TransferSchema = new mongoose.Schema(
  {
    transfer_key: { type: String, required: true, unique: true },
    case_id: { type: String, required: true, ref: 'Case', index: true },
    from_bureau: { type: String, required: true, enum: BUREAU_CODES },
    to_bureau: {
      type: String,
      required: true,
      enum: BUREAU_CODES,
      validate: { validator: function differs(v) { return v !== this.from_bureau; }, message: 'to_bureau must differ from from_bureau' },
    },
    reason: { type: String, required: true },
    requested_by: { type: String, required: true, ref: 'User' },
    requested_at: { type: Date, required: true },
    accepted_by: { type: String, default: null, ref: 'User', required: [function () { return this.state === 'accepted'; }, 'accepted transfers need accepted_by'] },
    accepted_at: { type: Date, default: null, required: [function () { return this.state === 'accepted'; }, 'accepted transfers need accepted_at'] },
    state: { type: String, required: true, enum: TRANSFER_STATES, default: 'pending' },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'transfers' }
);

TransferSchema.plugin(importMeta);

module.exports = mongoose.models.Transfer || mongoose.model('Transfer', TransferSchema);
