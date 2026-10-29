const { QueryParser, ID_PATTERNS } = require('../validators/query');
const { BUREAU_CODES, CASE_STATUS, REGIONS, CASE_CATEGORIES, IDENTITY_STATUS } = require('../models/constants');
const caseService = require('../services/case.service');
const { sendSuccess, apiError } = require('../utils/response');

const SORTABLE = ['receipt_date', 'expected_disposal_date', 'case_id', 'status', 'bureau', 'last_action_at'];

/** GET /api/v1/cases */
async function listCases(req, res) {
  const q = new QueryParser(req.query);
  const params = {
    ...q.pagination(),
    sort: q.sort('sort', SORTABLE, { receipt_date: -1 }),
    bureau: q.enumList('bureau', BUREAU_CODES),
    status: q.enumList('status', CASE_STATUS),
    region: q.enumList('region', REGIONS),
    category: q.enumList('category', CASE_CATEGORIES),
    identity_status: q.enumList('identity_status', IDENTITY_STATUS),
    is_overdue: q.bool('is_overdue'),
    institution_id: q.id('institution_id', ID_PATTERNS.institutionId),
    aicte_permanent_id: q.id('aicte_permanent_id', /^[A-Za-z0-9-]{3,40}$/),
    from: q.date('from'),
    to: q.date('to'),
    q: q.text('q'),
  };
  if (params.from && params.to && params.from > params.to) q.errors.push('from must be on or before to');
  q.assertValid();

  const { items, total, provenance } = await caseService.listCases(params);
  const applied = Object.fromEntries(
    Object.entries(params)
      .filter(([k, v]) => v !== undefined && !['page', 'limit', 'sort'].includes(k))
      .map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : v])
  );
  sendSuccess(req, res, items, {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
    sort: params.sort,
    filters: applied,
    provenance,
    overdue: caseService.overdueBasis(),
  });
}

/** GET /api/v1/cases/:caseId */
async function getCase(req, res) {
  const { caseId } = req.params;
  if (!ID_PATTERNS.caseId.test(caseId)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid case ID format', ['caseId has an invalid format']);
  const data = await caseService.getCase(caseId);
  if (!data) throw apiError(404, 'CASE_NOT_FOUND', `No case found with ID ${caseId}`);
  sendSuccess(req, res, data, { overdue: caseService.overdueBasis() });
}

module.exports = { listCases, getCase };
