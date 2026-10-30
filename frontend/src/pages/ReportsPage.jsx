import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchReports, fetchReport, reportCsvUrl } from '../services/api';
import { formatDateTime } from '../utils/format';
import { BarChart3, Building, ListChecks, AlarmClock, ArrowLeftRight, Copy, FileDown, Play } from 'lucide-react';

const ICONS = { bureau: BarChart3, institution: Building, status: ListChecks, overdue: AlarmClock, transfers: ArrowLeftRight, duplicates: Copy };

function ReportView({ id, range }) {
  const params = { from: range.from, to: range.to };
  const { data: r, loading, error, reload } = useApiResource((opts) => fetchReport(id, params, opts), [id, range.from, range.to]);
  if (loading) return <LoadingState label="Preparing report…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <div className="card-header">
        <div>
          <span className="card-title">{r.title}</span>
          <div className="row-muted">
            Generated {formatDateTime(r.generated_at)} · {r.rows.length} row{r.rows.length === 1 ? '' : 's'}
            {r.date_range && (r.date_range.from || r.date_range.to) && ` · Received ${r.date_range.from || 'start'} to ${r.date_range.to || 'today'}`}
          </div>
        </div>
        <a className="btn btn-primary btn-sm" href={reportCsvUrl(id, params)} download>
          <FileDown size={12} /> Download CSV
        </a>
      </div>
      {r.notes?.length > 0 && <ul className="reason-list" style={{ padding: '0.75rem 1.25rem 0 2.25rem', color: 'var(--text-muted)' }}>{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {r.rows.length === 0 ? (
        <EmptyState title="No data for this report" />
      ) : (
        <div className="table-wrapper" style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr>{r.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {r.rows.map((row, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>{r.columns.map((c) => <td key={c.key}>{row[c.key] === '' || row[c.key] === undefined ? '—' : row[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const { data: reports, loading, error, reload } = useApiResource((opts) => fetchReports(opts), []);
  const [range, setRange] = useState({ from: params.get('from') || '', to: params.get('to') || '' });
  const selected = params.get('report');
  const selectedDef = reports?.find((r) => r.id === selected);

  const open = (id) => {
    const next = new URLSearchParams();
    next.set('report', id);
    if (range.from) next.set('from', range.from);
    if (range.to) next.set('to', range.to);
    setParams(next);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Reports</h2>
          <p>Standard complaint reports, prepared from the current records when you open them</p>
        </div>
      </div>

      {loading && <div className="content-card"><LoadingState /></div>}
      {error && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {reports && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {reports.map((rep) => {
            const Icon = ICONS[rep.id] || BarChart3;
            const active = rep.id === selected;
            return (
              <div key={rep.id} className="content-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', outline: active ? '2px solid var(--accent-gold)' : 'none' }}>
                <div className="card-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div className="metric-icon-wrap"><Icon size={18} /></div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{rep.title}</h3>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rep.description}</p>
                </div>
                <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <a className="btn btn-outline btn-sm" href={reportCsvUrl(rep.id, rep.supports_date_range ? range : {})} download>
                    <FileDown size={12} /> CSV
                  </a>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => open(rep.id)} aria-pressed={active}>
                    <Play size={12} /> View report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDef && (
        <div className="content-card">
          {selectedDef.supports_date_range && (
            <div className="filter-bar">
              <label className="filter-label">
                Complaints received from
                <input type="date" className="filter-select" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </label>
              <label className="filter-label">
                to
                <input type="date" className="filter-select" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </label>
              {(range.from || range.to) && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setRange({ from: '', to: '' })}>All dates</button>
              )}
            </div>
          )}
          <ReportView id={selectedDef.id} range={selectedDef.supports_date_range ? range : { from: '', to: '' }} />
        </div>
      )}
      {reports && !selected && <p className="row-muted">Choose “View report” to see a report on screen, or download it as a CSV file for Excel.</p>}
    </div>
  );
}
