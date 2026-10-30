import React from 'react';

export default function MetricCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
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
        {subtext && <span className="metric-subtext">{subtext}</span>}
      </div>
    </div>
  );
}
