const app = require('./app');
const config = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');

async function startServer() {
  console.log('================================================================');
  console.log(' AICTE Integrated Institution Complaint Monitoring Dashboard');
  console.log(' Backend Server Initialization');
  console.log('================================================================');

  // Attempt database connection
  await connectDatabase();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] Server running in ${config.nodeEnv} mode`);
    console.log(`[Server] Listening on http://localhost:${config.port}`);
    console.log(`[Server] Health endpoint: http://localhost:${config.port}${config.apiPrefix}/health`);
  });

  // Graceful shutdown handling
  async function gracefulShutdown(signal) {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDatabase();
      console.log('[Server] Shutdown completed. Process exiting.');
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      console.error('[Server] Forced shutdown timeout exceeded. Exiting.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
