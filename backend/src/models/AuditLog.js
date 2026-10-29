const mongoose = require('mongoose');

/** Security / governance audit trail. Append-only. Not populated in this phase. */
const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, required: true },
    before_state: { type: mongoose.Schema.Types.Mixed, default: null },
    after_state: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, immutable: true },
  },
  { collection: 'audit_logs' }
);

AuditLogSchema.index({ entity_type: 1, entity_id: 1, timestamp: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
