import React from 'react';
import { Link } from 'react-router-dom';

/**
 * KPI card. `tone` sets the accent colour: navy (total), orange (pending), blue (in progress),
 * green (resolved), red (overdue), gold (possible duplicates). `to` makes the card a link.
 */
export default function MetricCard({ label, value, subtext, icon: Icon, tone = 'navy', to, isAlert = false }) {
  const body = (
    <>
      <div className="metric-card-header">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className="metric-icon-wrap" aria-hidden="true">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && (
        <div className="metric-footer">
          <span className="metric-subtext">{subtext}</span>
        </div>
      )}
    </>
  );
  const className = `metric-card metric-tone-${tone} ${isAlert ? 'metric-alert' : ''} ${to ? 'metric-link' : ''}`;
  return to ? <Link to={to} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}
