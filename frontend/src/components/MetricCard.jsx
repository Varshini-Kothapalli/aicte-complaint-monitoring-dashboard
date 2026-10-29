import React from 'react';
import ProvenanceTag from './ProvenanceTag';

export default function MetricCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  provenance = 'SYNTHETIC',
  isAlert = false 
}) {
  return (
    <div className={`metric-card ${isAlert ? 'metric-alert' : ''}`}>
      <div className="metric-card-header">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className="metric-icon-wrap">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        <ProvenanceTag type={provenance} />
        {subtext && <span className="metric-subtext">{subtext}</span>}
      </div>
    </div>
  );
}
