const { Router } = require('express');
const healthRoutes = require('./health.routes');
const caseRoutes = require('./case.routes');
const institutionRoutes = require('./institution.routes');
const monitoringRoutes = require('./monitoring.routes');

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);
router.use('/cases', caseRoutes);
router.use('/institutions', institutionRoutes);
router.use('/', monitoringRoutes);

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
      dashboard: '/api/v1/dashboard/summary',
      attention: '/api/v1/attention',
      duplicates: '/api/v1/duplicates',
      reports: '/api/v1/reports',
      users: '/api/v1/users',
    },
  });
});

module.exports = router;
