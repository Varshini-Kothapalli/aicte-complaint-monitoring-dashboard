const { Router } = require('express');
const requireDatabase = require('../middleware/requireDatabase');
const { asyncHandler } = require('../utils/response');
const { listInstitutions, getInstitution } = require('../controllers/institution.controller');

const router = Router();

router.use(requireDatabase);
router.get('/', asyncHandler(listInstitutions)); // GET /api/v1/institutions
router.get('/:institutionId', asyncHandler(getInstitution)); // GET /api/v1/institutions/:institutionId

module.exports = router;
