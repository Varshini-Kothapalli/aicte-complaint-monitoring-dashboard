const mongoose = require('mongoose');

/** In-app notification. Not populated in this phase. Auto-expires after 60 days. */
const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, ref: 'User', index: true },
    type: { type: String, required: true, enum: ['SLA_OVERDUE', 'OVERLAP_ALERT', 'CASE_ASSIGNED', 'TRANSFER_REQUEST'] },
    title: { type: String, required: true },
    message: { type: String, required: true },
    case_id: { type: String, default: null, ref: 'Case' },
    is_read: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now, expires: '60d' },
  },
  { collection: 'notifications' }
);

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
