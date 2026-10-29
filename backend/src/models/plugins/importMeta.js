const mongoose = require('mongoose');

/**
 * Adds an `import_meta` sub-document to records that originate from an import.
 * It records where the record came from (file + row), a hash of the normalised
 * source row (used to detect unchanged rows on re-import) and the import batches
 * that created / last changed it. Hidden from API responses by default.
 */
const ImportMetaSchema = new mongoose.Schema(
  {
    source_file: { type: String, required: true },
    source_row: { type: Number, required: true }, // 1-based data row (header excluded)
    source_hash: { type: String, required: true },
    first_import_batch: { type: String, required: true },
    last_changed_batch: { type: String, required: true },
    transformations: { type: [String], default: undefined }, // documented import-time patches, if any
  },
  { _id: false }
);

function importMetaPlugin(schema) {
  schema.add({ import_meta: { type: ImportMetaSchema, select: false } });
}

module.exports = importMetaPlugin;
