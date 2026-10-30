const { QueryParser, ID_PATTERNS } = require('../validators/query');
const { REGIONS, STREAMS, OWNERSHIP } = require('../models/constants');
const institutionService = require('../services/institution.service');
const { overdueBasis } = require('../services/case.service');
const { sendSuccess, apiError } = require('../utils/response');

const SORTABLE = ['name', 'institution_id', 'state', 'district', 'region', 'established'];

/** GET /api/v1/institutions */
async function listInstitutions(req, res) {
  const q = new QueryParser(req.query);
  const params = {
    ...q.pagination(),
    sort: q.sort('sort', SORTABLE, { name: 1 }),
    region: q.enumList('region', REGIONS),
    stream: q.enumList('stream', STREAMS),
    ownership: q.enumList('ownership', OWNERSHIP),
    state: q.text('state'),
    q: q.text('q'),
  };
  q.assertValid();
  const { items, total } = await institutionService.listInstitutions(params);
  sendSuccess(req, res, items, {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
    sort: params.sort,
    filters: Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== undefined && !['page', 'limit', 'sort'].includes(k))),
    overdue: overdueBasis(),
  });
}

/** GET /api/v1/institutions/:institutionId */
async function getInstitution(req, res) {
  const { institutionId } = req.params;
  if (!ID_PATTERNS.institutionId.test(institutionId)) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid institution ID format', ['institutionId has an invalid format']);
  }
  const data = await institutionService.getInstitution(institutionId);
  if (!data) throw apiError(404, 'INSTITUTION_NOT_FOUND', `No institution found with ID ${institutionId}`);
  sendSuccess(req, res, data, { overdue: overdueBasis() });
}

module.exports = { listInstitutions, getInstitution };
