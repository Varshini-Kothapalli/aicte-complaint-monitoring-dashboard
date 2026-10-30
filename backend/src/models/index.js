/** Central model registry. Import models from here so every schema is registered once. */
const Institution = require('./Institution');
const InstAlias = require('./InstAlias');
const Bureau = require('./Bureau');
const User = require('./User');
const CategoryMatrix = require('./CategoryMatrix');
const Case = require('./Case');
const CaseAction = require('./CaseAction');
const Transfer = require('./Transfer');
const OverlapGroundTruth = require('./OverlapGroundTruth');
const OverlapCandidate = require('./OverlapCandidate');
const CaseEmbedding = require('./CaseEmbedding');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const ImportBatch = require('./ImportBatch');

const ALL_MODELS = [
  Institution, InstAlias, Bureau, User, CategoryMatrix, Case, CaseAction, Transfer,
  OverlapGroundTruth, OverlapCandidate, CaseEmbedding, Notification, AuditLog, ImportBatch,
];

/**
 * Create any missing indexes declared in the schemas. Uses createIndexes (not syncIndexes),
 * so indexes created by someone else are never dropped.
 */
async function ensureIndexes() {
  for (const model of ALL_MODELS) {
    await model.createIndexes();
  }
}

module.exports = {
  Institution,
  InstAlias,
  Bureau,
  User,
  CategoryMatrix,
  Case,
  CaseAction,
  Transfer,
  OverlapGroundTruth,
  OverlapCandidate,
  CaseEmbedding,
  Notification,
  AuditLog,
  ImportBatch,
  ALL_MODELS,
  ensureIndexes,
};
