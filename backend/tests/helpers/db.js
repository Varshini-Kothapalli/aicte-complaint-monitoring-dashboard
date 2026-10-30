/**
 * Test database helpers. Tests only ever touch databases whose name contains "_test";
 * the guard below refuses anything else, so a mis-set env var cannot wipe a dev database.
 */
const mongoose = require('mongoose');
const { ensureIndexes } = require('../../src/models');

const BASE_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/aicte_complaints_test';

function uriFor(suffix) {
  const u = new URL(BASE_URI);
  const base = u.pathname.replace(/^\//, '') || 'aicte_complaints_test';
  u.pathname = `/${base}_${suffix}`;
  return u.toString();
}

async function connectFresh(suffix) {
  const uri = uriFor(suffix);
  // Mongoose cannot switch an open connection to another database; close it first.
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  const name = mongoose.connection.db.databaseName;
  if (!name.includes('_test')) {
    await mongoose.disconnect();
    throw new Error(`Refusing to reset non-test database "${name}"`);
  }
  await mongoose.connection.db.dropDatabase();
  await ensureIndexes();
  return mongoose.connection;
}

async function disconnect() {
  await mongoose.disconnect();
}

module.exports = { connectFresh, disconnect, uriFor };
