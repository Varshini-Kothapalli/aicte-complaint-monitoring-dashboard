const { Router } = require('express');
const requireDatabase = require('../middleware/requireDatabase');
const { asyncHandler } = require('../utils/response');
const monitoring = require('../controllers/monitoring.controller');
const reports = require('../controllers/report.controller');
const duplicates = require('../controllers/duplicate.controller');

const router = Router();
// requireDatabase is applied per route: this router is mounted at the API root, so a router-wide
// guard would also catch unrelated paths (and turn their 404s into 503s).
const db = requireDatabase;

router.get('/dashboard/summary', db, asyncHandler(monitoring.getSummary));
router.get('/attention', db, asyncHandler(monitoring.getAttention));
router.get('/users', db, asyncHandler(monitoring.getUsers));

router.get('/reports', db, reports.listReports);
router.get('/reports/:reportId', db, asyncHandler(reports.getReport));

router.get('/duplicates', db, asyncHandler(duplicates.list));
router.get('/duplicates/:pairKey', db, asyncHandler(duplicates.getOne));
router.post('/duplicates/:pairKey/decision', db, asyncHandler(duplicates.decide));

module.exports = router;
