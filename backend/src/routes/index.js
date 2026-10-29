const { Router } = require('express');
const healthRoutes = require('./health.routes');
const caseRoutes = require('./case.routes');
const institutionRoutes = require('./institution.routes');

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);
router.use('/cases', caseRoutes);
router.use('/institutions', institutionRoutes);

// Root API information
router.get('/', (req, res) => {
  res.json({
    message: 'AICTE Integrated Institution Complaint Monitoring and Status Dashboard API',
    version: '1.0.0',
    documentation: '/docs/API_SPECIFICATION.md',
    endpoints: {
      health: '/api/v1/health',
      cases: '/api/v1/cases',
      caseDetail: '/api/v1/cases/:caseId',
      institutions: '/api/v1/institutions',
      institutionDetail: '/api/v1/institutions/:institutionId',
      overlap: '/api/v1/overlap (Planned)',
      reports: '/api/v1/reports (Planned)',
    },
  });
});

module.exports = router;
