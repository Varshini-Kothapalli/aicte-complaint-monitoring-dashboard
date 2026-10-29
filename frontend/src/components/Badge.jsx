import React from 'react';

export default function Badge({ status, variant = 'status', children }) {
  const text = children || status;
  if (!text) return null;

  const key = String(text).toLowerCase().replace(/[\s_]+/g, '-');
  
  return (
    <span className={`status-badge ${key}`}>
      {text}
    </span>
  );
}
