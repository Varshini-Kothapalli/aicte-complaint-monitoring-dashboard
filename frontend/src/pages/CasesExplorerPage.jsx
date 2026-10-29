import React, { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import SyntheticNotice from '../components/SyntheticNotice';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchCases } from '../services/api';
import { BUREAUS, STATUSES, REGIONS, CATEGORIES, formatDate, humanize } from '../utils/format';
import { RefreshCw, Eye, X } from 'lucide-react';

const FILTER_KEYS = ['bureau', 'status', 'region', 'category', 'is_overdue', 'from', 'to', 'q', 'institution_id'];

export default function CasesExplorerPage() {
  const { currentBureau } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const get = (k, def = '') => params.get(k) ?? def;

  // Search box is debounced so typing does not fire a request per keystroke.
  const [searchInput, setSearchInput] = useState(get('q'));
  useEffect(() => setSearchInput(get('q')), [params]); // keep box in sync with back/forward navigation
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== get('q')) update({ q: searchInput.trim() });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function update(changes, { resetPage = true } = {}) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v === 'ALL' || v == null ? next.delete(k) : next.set(k, String(v))));
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next);
  }

  // The header's Bureau scope applies when the user has not chosen a Bureau filter.
  const bureau = get('bureau') || (currentBureau && currentBureau !== 'ALL' ? currentBureau : '');
  const query = {
    page: get('page', '1'),
    limit: get('limit', '20'),
    bureau,
    status: get('status'),
    region: get('region'),
    category: get('category'),
    is_overdue: get('is_overdue'),
    from: get('from'),
    to: get('to'),
    q: get('q'),
    institution_id: get('institution_id'),
  };
  const key = JSON.stringify(query);
  const { data, meta, loading, error, details, reload } = useApiResource((opts) => fetchCases(query, opts), [key]);
  const activeFilters = FILTER_KEYS.filter((k) => get(k));

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>All Cases Explorer</h2>
          <p>Search, filter, and inspect institution-related cases across all Bureaus</p>
        </div>
        <ProvenanceTag type="SYNTHETIC" />
      </div>

      <SyntheticNotice provenance={meta?.provenance} overdue={meta?.overdue} />

      <div className="content-card">
        {/* Filters */}
        <div className="filter-bar">
          <select className="filter-select" value={bureau || 'ALL'} onChange={(e) => update({ bureau: e.target.value })} aria-label="Bureau">
            <option value="ALL">All Bureaus (PGRC, RB, AB)</option>
            {BUREAUS.map((b) => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
          </select>

          <select className="filter-select" value={get('status', 'ALL')} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
            <option value="ALL">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="filter-select" value={get('region', 'ALL')} onChange={(e) => update({ region: e.target.value })} aria-label="Region">
            <option value="ALL">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select className="filter-select" value={get('category', 'ALL')} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
          </select>

          <select className="filter-select" value={get('is_overdue', 'ALL')} onChange={(e) => update({ is_overdue: e.target.value })} aria-label="Overdue">
            <option value="ALL">Overdue: any</option>
            <option value="true">Overdue only</option>
            <option value="false">Not overdue</option>
          </select>

          <label className="filter-label">
            Received from
            <input type="date" className="filter-select" value={get('from')} onChange={(e) => update({ from: e.target.value })} />
          </label>
          <label className="filter-label">
            to
            <input type="date" className="filter-select" value={get('to')} onChange={(e) => update({ to: e.target.value })} />
          </label>

          <input
            type="search"
            placeholder="Case ID, institution, AICTE ID or keyword…"
            className="filter-select"
            style={{ width: '280px' }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search cases"
          />

          {activeFilters.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => { setSearchInput(''); setParams(new URLSearchParams()); }}>
              <X size={14} /> Clear filters
            </button>
          )}
          <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {get('institution_id') && (
          <div className="row-muted" style={{ padding: '0.5rem 1.25rem' }}>
            Showing cases for institution <span className="cell-code">{get('institution_id')}</span>
          </div>
        )}

        {loading && <LoadingState label="Loading cases…" />}
        {!loading && error && <ErrorState message={error} details={details} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && (
          <EmptyState title="No cases match these filters" message="Try removing a filter or searching for a different keyword." />
        )}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Institution</th>
                  <th>Bureau</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Expected Disposal</th>
                  <th>Assigned Officer</th>
                  <th>Data</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.case_id}>
                    <td className="cell-code">{c.case_id}</td>
                    <td>
                      {c.institution ? (
                        <>
                          <Link className="table-link" to={`/institutions/${c.institution.institution_id}`}>{c.institution.name}</Link>
                          <div className="row-muted">{c.institution.district}, {c.institution.state}</div>
                        </>
                      ) : (
                        <>
                          <strong>{c.raw_institution_name || 'Unknown institution'}</strong>
                          <div className="warn-text">Identity {humanize(c.identity_status).toLowerCase()} – not linked</div>
                        </>
                      )}
                    </td>
                    <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                    <td>
                      {c.subject}
                      {humanize(c.category).toLowerCase() !== c.subject.toLowerCase() && <div className="row-muted">{humanize(c.category)}</div>}
                    </td>
                    <td>
                      <Badge status={c.status} />
                      {c.is_overdue && (
                        <span style={{ marginLeft: '0.25rem' }}>
                          <Badge status="overdue">Overdue</Badge>
                        </span>
                      )}
                    </td>
                    <td>{formatDate(c.receipt_date)}</td>
                    <td>{formatDate(c.expected_disposal_date)}</td>
                    <td className="cell-code" style={{ fontSize: '0.75rem' }}>{c.assigned_officer || '—'}</td>
                    <td><ProvenanceTag type={c.provenance} /></td>
                    <td>
                      <Link className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} to={`/cases/${c.case_id}`}>
                        <Eye size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && meta && (
          <Pagination
            meta={meta}
            noun="cases"
            onPageChange={(p) => update({ page: p }, { resetPage: false })}
            onLimitChange={(l) => update({ limit: l })}
          />
        )}
      </div>
    </div>
  );
}
