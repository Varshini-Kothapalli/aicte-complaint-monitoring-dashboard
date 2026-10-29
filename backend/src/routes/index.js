const { Router } = require('express');
const healthRoutes = require('./health.routes');

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);

// Root API information
router.get('/', (req, res) => {
  res.json({
    message: 'AICTE Integrated Institution Complaint Monitoring and Status Dashboard API',
    version: '1.0.0',
    documentation: '/docs/API_SPECIFICATION.md',
    endpoints: {
      health: '/api/v1/health',
      cases: '/api/v1/cases (Planned)',
      institutions: '/api/v1/institutions (Planned)',
      overlap: '/api/v1/overlap (Planned)',
      reports: '/api/v1/reports (Planned)',
    },
  });
});

module.exports = router;
