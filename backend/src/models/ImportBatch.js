const mongoose = require('mongoose');

/**
 * One row per importer run (including dry runs, which are not written to the DB).
 * Records what was read, what changed, what was rejected and why, and the source-file hashes,
 * so every imported record can be traced back to an exact file version.
 */
const ImportBatchSchema = new mongoose.Schema(
  {
    batch_id: { type: String, required: true, unique: true },
    source: { type: String, required: true }, // e.g. "synthetic-fixtures"
    data_dir: { type: String, required: true },
    started_at: { type: Date, required: true },
    finished_at: { type: Date, default: null },
    status: { type: String, enum: ['running', 'completed', 'completed_with_rejections', 'failed'], default: 'running' },
    files: [
      {
        _id: false,
        file: String,
        sha256: String,
        rows: Number,
      },
    ],
    summary: { type: mongoose.Schema.Types.Mixed, default: {} }, // per collection counts
    transformations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rejections: { type: [mongoose.Schema.Types.Mixed], default: [] }, // file, row, key, reasons (no record content)
    warnings: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'import_batches' }
);

module.exports = mongoose.models.ImportBatch || mongoose.model('ImportBatch', ImportBatchSchema);
