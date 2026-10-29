import React from 'react';
import { Loader2, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/** Loading indicator for table / card bodies. */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="data-state" role="status" aria-live="polite">
      <Loader2 size={20} className="spin" />
      <span>{label}</span>
    </div>
  );
}

/** Error panel with an optional retry button. Shows the API's message, never a stack trace. */
export function ErrorState({ message, onRetry, details }) {
  return (
    <div className="data-state data-state-error" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>Could not load data.</strong> {message}
        {Array.isArray(details) && details.length > 0 && (
          <ul className="data-state-details">{details.map((d) => <li key={d}>{d}</li>)}</ul>
        )}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

/** Empty result (uses the existing .empty-state styles). */
export function EmptyState({ title = 'No records found', message, action }) {
  return (
    <div className="empty-state">
      <Inbox className="empty-state-icon" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
