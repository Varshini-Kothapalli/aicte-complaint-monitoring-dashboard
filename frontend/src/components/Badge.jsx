import React from 'react';
import { statusLabel } from '../utils/format';

/**
 * Status / Bureau pill. The CSS class comes from the stored value (so colours stay stable) while
 * the visible text uses the administrative label (e.g. Disposed is shown as "Resolved").
 */
export default function Badge({ status, children, title }) {
  const text = children || statusLabel(status);
  if (!text) return null;
  const key = String(status || text).toLowerCase().replace(/[\s_]+/g, '-');
  return (
    <span className={`status-badge ${key}`} title={title}>
      {text}
    </span>
  );
}
