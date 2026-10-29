const { getConnectionStatus } = require('../config/database');
const config = require('../config/env');

/**
 * Controller for GET /api/v1/health
 */
function getHealth(req, res) {
  const dbStatus = getConnectionStatus();
  const isHealthy = dbStatus.isHealthy;

  const mem = process.memoryUsage();
  const memoryInfo = {
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };

  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'AICTE Integrated Institution Complaint Monitoring and Status Dashboard API',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.state,
      healthy: dbStatus.isHealthy,
      databaseName: dbStatus.databaseName,
      connectedAt: dbStatus.connectedAt,
      error: dbStatus.lastError,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: memoryInfo,
    },
  });
}

module.exports = {
  getHealth,
};
