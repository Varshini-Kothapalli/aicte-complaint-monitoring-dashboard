import React, { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchCases } from '../services/api';
import {
  BUREAUS, STATUSES, REGIONS, CATEGORIES, formatDate, humanize, statusLabel, displayCaseId, displayInstitutionId,
} from '../utils/format';
import { RefreshCw, Eye, X, SlidersHorizontal } from 'lucide-react';

const FILTER_KEYS = ['bureau', 'status', 'region', 'category', 'is_overdue', 'from', 'to', 'q', 'institution_id'];
const MORE_KEYS = ['region', 'category', 'from', 'to'];

export default function CasesExplorerPage() {
  const { currentBureau } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const get = (k, def = '') => params.get(k) ?? def;
  const [showMore, setShowMore] = useState(MORE_KEYS.some((k) => params.get(k)));

  // Search box is debounced so typing does not fire a request per keystroke.
  const [searchInput, setSearchInput] = useState(get('q'));
  useEffect(() => setSearchInput(get('q')), [params]);
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

  // The header's Bureau selection applies when no Bureau filter is chosen here.
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
  const { data, meta, loading, error, details, reload } = useApiResource((opts) => fetchCases(query, opts), [JSON.stringify(query)]);
  const activeFilters = FILTER_KEYS.filter((k) => get(k));
  const statusValue = get('status', 'ALL');
  const isKnownStatus = statusValue === 'ALL' || STATUSES.includes(statusValue);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>All Complaints</h2>
          <p>Search and track complaints across all Bureaus</p>
        </div>
      </div>

      <div className="content-card">
        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search by case ID, institution or keyword"
            className="filter-select"
            style={{ width: '280px' }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search complaints"
          />

          <select className="filter-select" value={bureau || 'ALL'} onChange={(e) => update({ bureau: e.target.value })} aria-label="Bureau">
            <option value="ALL">All Bureaus</option>
            {BUREAUS.map((b) => <option key={b.code} value={b.code}>{b.code} – {b.name}</option>)}
          </select>

          <select className="filter-select" value={isKnownStatus ? statusValue : 'GROUP'} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
            <option value="ALL">All statuses</option>
            {!isKnownStatus && <option value="GROUP" disabled>{statusValue.split(',').map(statusLabel).join(' or ')}</option>}
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>

          <select className="filter-select" value={get('is_overdue', 'ALL')} onChange={(e) => update({ is_overdue: e.target.value })} aria-label="Overdue">
            <option value="ALL">Overdue and on time</option>
            <option value="true">Overdue only</option>
            <option value="false">On time only</option>
          </select>

          <button type="button" className="btn btn-outline" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
            <SlidersHorizontal size={14} /> More filters
          </button>

          {showMore && (
            <div className="more-filters">
              <select className="filter-select" value={get('region', 'ALL')} onChange={(e) => update({ region: e.target.value })} aria-label="Region">
                <option value="ALL">All regions</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="filter-select" value={get('category', 'ALL')} onChange={(e) => update({ category: e.target.value })} aria-label="Complaint type">
                <option value="ALL">All complaint types</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
              </select>
              <label className="filter-label">
                Received from
                <input type="date" className="filter-select" value={get('from')} onChange={(e) => update({ from: e.target.value })} />
              </label>
              <label className="filter-label">
                to
                <input type="date" className="filter-select" value={get('to')} onChange={(e) => update({ to: e.target.value })} />
              </label>
            </div>
          )}

          {activeFilters.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => { setSearchInput(''); setParams(new URLSearchParams()); }}>
              <X size={14} /> Clear
            </button>
          )}
          <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {get('institution_id') && (
          <div className="row-muted" style={{ padding: '0.5rem 1.25rem' }}>
            Showing complaints for institution {displayInstitutionId(get('institution_id'))}
          </div>
        )}

        {loading && <LoadingState label="Loading complaints…" />}
        {!loading && error && <ErrorState message={error} details={details} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && (
          <EmptyState title="No complaints match" message="Try removing a filter or searching for something else." />
        )}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Institution</th>
                  <th>Complaint Subject</th>
                  <th>Bureau</th>
                  <th>Status</th>
                  <th>Assigned Officer</th>
                  <th>Target Resolution Date</th>
                  <th><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.case_id}>
                    <td className="cell-code">{displayCaseId(c.case_id)}</td>
                    <td>
                      {c.institution ? (
                        <>
                          <Link className="table-link" to={`/institutions/${c.institution.institution_id}`}>{c.institution.name}</Link>
                          <div className="row-muted">{c.institution.district}, {c.institution.state}</div>
                        </>
                      ) : (
                        <>
                          <strong>{c.raw_institution_name || 'Institution not identified'}</strong>
                          <div className="warn-text">Institution not yet verified</div>
                        </>
                      )}
                    </td>
                    <td>
                      {c.subject}
                      {humanize(c.category).toLowerCase() !== c.subject.toLowerCase() && <div className="row-muted">{humanize(c.category)}</div>}
                    </td>
                    <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                    <td>
                      <Badge status={c.status} />
                      {c.is_overdue && <div style={{ marginTop: '0.25rem' }}><Badge status="overdue">Overdue</Badge></div>}
                    </td>
                    <td>
                      {c.assigned_officer_display ? (
                        <>
                          {c.assigned_officer_display.name}
                          {c.assigned_officer_display.designation && <div className="row-muted">{c.assigned_officer_display.designation}</div>}
                        </>
                      ) : <span className="row-muted">Not yet assigned</span>}
                    </td>
                    <td>{formatDate(c.expected_disposal_date)}</td>
                    <td>
                      <Link className="btn btn-outline btn-sm" to={`/cases/${c.case_id}`} aria-label={`View ${displayCaseId(c.case_id)}`}>
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
            noun="complaints"
            onPageChange={(p) => update({ page: p }, { resetPage: false })}
            onLimitChange={(l) => update({ limit: l })}
          />
        )}
      </div>
    </div>
  );
}
