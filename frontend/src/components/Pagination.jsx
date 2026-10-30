import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SIZES = [10, 20, 50, 100];

/** Pager driven by the API's meta: { page, limit, total, totalPages }. */
export default function Pagination({ meta, onPageChange, onLimitChange, noun = 'records' }) {
  if (!meta) return null;
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="pagination-bar">
      <span>
        Showing <strong>{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}</strong> of{' '}
        <strong>{total.toLocaleString('en-IN')}</strong> {noun}
      </span>
      <div className="pagination-controls">
        <label>
          Rows
          <select className="filter-select" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span>Page {page} of {Math.max(totalPages, 1)}</span>
        <button type="button" className="btn btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
