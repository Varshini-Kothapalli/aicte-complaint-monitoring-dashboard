import React from 'react';
import { Info } from 'lucide-react';

/**
 * States plainly that the records shown are synthetic demonstration data, so they are never
 * mistaken for actual AICTE cases. `provenance` is the API's { LABEL: count } summary.
 */
export default function SyntheticNotice({ provenance, overdue }) {
  const labels = provenance ? Object.keys(provenance) : ['SYNTHETIC'];
  const allSynthetic = labels.length > 0 && labels.every((l) => l === 'SYNTHETIC');
  return (
    <div className="notice-bar">
      <Info size={16} />
      <span>
        {allSynthetic
          ? 'All records shown are SYNTHETIC demonstration data generated for this prototype. They are not actual AICTE cases, institutions or officers.'
          : `Records shown include: ${labels.join(', ')}. Synthetic records are demonstration data, not actual AICTE cases.`}
        {overdue?.basis === 'dataset_snapshot' && (
          <> Overdue flags are a dataset snapshot as of {overdue.as_of}, not recalculated live.</>
        )}
      </span>
    </div>
  );
}
