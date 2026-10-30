const { QueryParser, ID_PATTERNS } = require('../validators/query');
const { BANDS } = require('../models/constants');
const dup = require('../services/duplicate.service');
const { sendSuccess, apiError } = require('../utils/response');

const DECISIONS = ['pending', 'confirmed_linked', 'dismissed_unrelated'];
const PAIR_KEY = /^[A-Za-z0-9-]{3,40}:[A-Za-z0-9-]{3,40}$/;

/** GET /api/v1/duplicates */
async function list(req, res) {
  const q = new QueryParser(req.query);
  const params = {
    status: q.enumList('status', DECISIONS),
    band: q.enumList('band', BANDS.filter((b) => b !== 'NONE')),
    institution_id: q.id('institution_id', ID_PATTERNS.institutionId),
    ...q.pagination(),
  };
  q.assertValid();
  const { items, total, summary, scanned } = await dup.listCandidates(params);
  sendSuccess(req, res, items, { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit), summary, scanned, method: dup.RULES_VERSION });
}

/** GET /api/v1/duplicates/:pairKey */
async function getOne(req, res) {
  if (!PAIR_KEY.test(req.params.pairKey)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid pair reference', ['pairKey has an invalid format']);
  const data = await dup.getCandidate(req.params.pairKey);
  if (!data) throw apiError(404, 'PAIR_NOT_FOUND', 'No possible-duplicate record found for these complaints');
  sendSuccess(req, res, data);
}

/** POST /api/v1/duplicates/:pairKey/decision  { decision, reviewer_id, note } */
async function decide(req, res) {
  if (!PAIR_KEY.test(req.params.pairKey)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid pair reference', ['pairKey has an invalid format']);
  const { decision, reviewer_id: reviewerId, note } = req.body || {};
  const errors = [];
  if (!['confirmed_linked', 'dismissed_unrelated'].includes(decision)) errors.push('decision must be confirmed_linked or dismissed_unrelated');
  if (typeof reviewerId !== 'string' || !/^[A-Za-z0-9-]{3,40}$/.test(reviewerId)) errors.push('reviewer_id is required');
  if (typeof note !== 'string' || note.trim().length < 5 || note.length > 1000) errors.push('note is required (5 to 1000 characters)');
  if (errors.length) throw apiError(400, 'VALIDATION_ERROR', 'Invalid decision', errors);
  const data = await dup.decide(req.params.pairKey, { decision, reviewer_id: reviewerId, note: note.trim() }, { ip: req.ip });
  sendSuccess(req, res, data);
}

module.exports = { list, getOne, decide };
