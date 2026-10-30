const mongoose = require('mongoose');
const importMeta = require('./plugins/importMeta');
const { USER_ROLES, BUREAU_CODES, REGIONS, PROVENANCE } = require('./constants');

/**
 * Official accounts. Fixtures are role-numbered synthetic users (no real officer identities).
 * Authentication is not implemented yet, so no password hash is imported or invented:
 * `password_hash` stays null until the auth phase sets real hashes.
 */
const UserSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, trim: true },
    display_name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: USER_ROLES, index: true },
    bureau: { type: String, enum: [...BUREAU_CODES, null], default: null, index: true },
    region: { type: String, enum: [...REGIONS, null], default: null, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, default: null, select: false },
    is_active: { type: Boolean, default: true },
    // Original ID from the source file when an import-time transformation changed user_id.
    source_user_id: { type: String, default: null },
    provenance: { type: String, required: true, enum: PROVENANCE, default: 'SYNTHETIC' },
  },
  { timestamps: true, collection: 'users' }
);

UserSchema.plugin(importMeta);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
