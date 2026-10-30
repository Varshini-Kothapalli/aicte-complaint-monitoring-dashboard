const { QueryParser } = require('../validators/query');
const reports = require('../services/report.service');
const { sendSuccess, apiError } = require('../utils/response');

/** GET /api/v1/reports */
function listReports(req, res) {
  sendSuccess(req, res, reports.listReports());
}

/** GET /api/v1/reports/:reportId?from=&to=&format=json|csv */
async function getReport(req, res) {
  const q = new QueryParser(req.query);
  const from = q.date('from');
  const to = q.date('to');
  const format = (q.enumList('format', ['json', 'csv']) || ['json'])[0];
  if (from && to && from > to) q.errors.push('from must be on or before to');
  q.assertValid();
  const report = await reports.buildReport(req.params.reportId, { from, to });
  if (!report) throw apiError(404, 'REPORT_NOT_FOUND', `Unknown report "${req.params.reportId}"`);
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.id}-report-${report.generated_at.slice(0, 10)}.csv"`);
    return res.send(reports.toCsv(report));
  }
  return sendSuccess(req, res, report);
}

module.exports = { listReports, getReport };
