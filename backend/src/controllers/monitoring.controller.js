const { QueryParser } = require('../validators/query');
const { BUREAU_CODES, USER_ROLES } = require('../models/constants');
const monitoring = require('../services/monitoring.service');
const { sendSuccess } = require('../utils/response');

/** GET /api/v1/dashboard/summary */
async function getSummary(req, res) {
  const [data, recent] = await Promise.all([monitoring.summary(), monitoring.recentComplaints(6)]);
  sendSuccess(req, res, { ...data, recent });
}

/** GET /api/v1/attention?section=overdue|due_soon|unassigned */
async function getAttention(req, res) {
  const q = new QueryParser(req.query);
  const params = {
    section: (q.enumList('section', ['overdue', 'due_soon', 'unassigned']) || ['overdue'])[0],
    days: q.int('days', { def: 7, min: 1, max: 60 }),
    bureau: q.enumList('bureau', BUREAU_CODES),
    ...q.pagination(),
  };
  q.assertValid();
  const { items, total, counts, reference } = await monitoring.attention(params);
  sendSuccess(req, res, items, { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit), section: params.section, counts, reference });
}

/** GET /api/v1/users — display directory (no credentials or e-mail addresses). */
async function getUsers(req, res) {
  const q = new QueryParser(req.query);
  const roles = q.enumList('role', USER_ROLES);
  q.assertValid();
  sendSuccess(req, res, await monitoring.listUsers({ roles }));
}

module.exports = { getSummary, getAttention, getUsers };
