const { Router } = require('express');
const requireDatabase = require('../middleware/requireDatabase');
const { asyncHandler } = require('../utils/response');
const { listCases, getCase } = require('../controllers/case.controller');

const router = Router();

router.use(requireDatabase);
router.get('/', asyncHandler(listCases)); // GET /api/v1/cases
router.get('/:caseId', asyncHandler(getCase)); // GET /api/v1/cases/:caseId

module.exports = router;
