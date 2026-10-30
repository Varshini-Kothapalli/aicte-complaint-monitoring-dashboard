const mongoose = require('mongoose');
const config = require('./env');

let connectionState = {
  status: 'disconnected',
  lastError: null,
  connectedAt: null,
  host: null,
  name: null,
};

/**
 * Initialize MongoDB connection via Mongoose
 */
async function connectDatabase() {
  const { uri, connectTimeoutMS } = config.mongo;

  mongoose.connection.on('connected', () => {
    connectionState.status = 'connected';
    connectionState.lastError = null;
    connectionState.connectedAt = new Date();
    connectionState.host = mongoose.connection.host;
    connectionState.name = mongoose.connection.name;
    console.log(`[Database] MongoDB connected successfully to database "${connectionState.name}" on ${connectionState.host}`);
  });

  mongoose.connection.on('error', (err) => {
    connectionState.status = 'error';
    connectionState.lastError = err.message;
    console.error(`[Database] MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    connectionState.status = 'disconnected';
    console.warn('[Database] MongoDB connection disconnected');
  });

  try {
    connectionState.status = 'connecting';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: connectTimeoutMS,
    });
    return mongoose.connection;
  } catch (error) {
    connectionState.status = 'error';
    connectionState.lastError = error.message;
    console.error('================================================================');
    console.error('[Database] Failed to connect to MongoDB:');
    const sanitizedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '(empty)';
    console.error(`  URI: ${sanitizedUri}`);
    console.error(`  Error: ${error.message}`);
    console.error('  TROUBLESHOOTING:');
    console.error('  1. Ensure MongoDB service is running (e.g., `net start MongoDB`).');
    console.error('  2. Verify the MONGODB_URI in backend/.env is correct.');
    console.error('  3. The server will continue running in degraded mode.');
    console.error('================================================================');
    return null;
  }
}

/**
 * Returns current database connection diagnostic state
 */
function getConnectionStatus() {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateIndex = mongoose.connection.readyState;
  return {
    state: readyStates[stateIndex] || 'unknown',
    isHealthy: stateIndex === 1,
    host: connectionState.host,
    databaseName: connectionState.name,
    connectedAt: connectionState.connectedAt,
    lastError: connectionState.lastError,
  };
}

/**
 * Close database connection gracefully
 */
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly');
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnectionStatus,
};
