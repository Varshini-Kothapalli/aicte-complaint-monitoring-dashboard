import React from 'react';

export default function ProvenanceTag({ type = 'SYNTHETIC', showLabel = true }) {
  const norm = type.toUpperCase().replace(/\s+/g, '_');
  
  let className = 'provenance-tag provenance-synthetic';
  let label = 'SYNTHETIC';

  if (norm.includes('UNVERIFIED')) {
    className = 'provenance-tag provenance-unverified';
    label = 'IMPORTED UNVERIFIED';
  } else if (norm.includes('VERIFIED')) {
    className = 'provenance-tag provenance-verified';
    label = 'VERIFIED';
  } else if (norm.includes('DERIVED')) {
    className = 'provenance-tag provenance-derived';
    label = 'DERIVED';
  }

  return (
    <span className={className} title={`Data Provenance: ${label}`}>
      {label}
    </span>
  );
}
