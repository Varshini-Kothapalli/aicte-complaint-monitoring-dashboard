const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aicte_complaints',
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS, 10) || 5000,
  },
  // Directory with the synthetic fixture CSVs used by scripts/seed_database.js
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, '../../../data/processed/extracted/csv'),
  // The synthetic dataset's own "today": is_overdue in cases.csv was computed as of this date.
  datasetSnapshotDate: process.env.DATASET_SNAPSHOT_DATE || '2026-10-31',
};

module.exports = config;
