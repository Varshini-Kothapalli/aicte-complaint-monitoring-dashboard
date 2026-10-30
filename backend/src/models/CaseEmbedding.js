const mongoose = require('mongoose');

/** Sentence embedding of a case's text (DERIVED). Not populated in this phase. */
const CaseEmbeddingSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, unique: true, ref: 'Case' },
    model: { type: String, required: true, default: 'all-MiniLM-L6-v2' },
    vector: {
      type: [Number],
      required: true,
      validate: { validator: (v) => Array.isArray(v) && v.length === 384, message: 'vector must have 384 dimensions' },
    },
    text_hash: { type: String, required: true },
    provenance: { type: String, enum: ['DERIVED'], default: 'DERIVED' },
  },
  { timestamps: true, collection: 'case_embeddings' }
);

module.exports = mongoose.models.CaseEmbedding || mongoose.model('CaseEmbedding', CaseEmbeddingSchema);
