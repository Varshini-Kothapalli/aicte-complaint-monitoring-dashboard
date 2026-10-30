import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchInstitutions } from '../services/api';
import { REGIONS, STREAMS, verifiedAicteId, formatNumber } from '../utils/format';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const BUREAU_ORDER = ['PGRC', 'RB', 'AB'];

export default function InstitutionsPage() {
  const [params, setParams] = useSearchParams();
  const get = (k, def = '') => params.get(k) ?? def;
  const [searchInput, setSearchInput] = useState(get('q'));

  function update(changes, { resetPage = true } = {}) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v === 'ALL' || v == null ? next.delete(k) : next.set(k, String(v))));
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next);
  }

  useEffect(() => setSearchInput(get('q')), [params]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== get('q')) update({ q: searchInput.trim() });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = { page: get('page', '1'), limit: get('limit', '20'), q: get('q'), region: get('region'), stream: get('stream') };
  const { data, meta, loading, error, details, reload } = useApiResource((opts) => fetchInstitutions(query, opts), [JSON.stringify(query)]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Institutions</h2>
          <p>Each institution with all its complaints across PGRC, the Regulation Bureau and the Approval Bureau</p>
        </div>
      </div>

      <div className="content-card" style={{ borderLeft: '4px solid var(--primary-navy)' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Institution Verification</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            A complaint is linked to an institution only when the institution is clearly identified. Where two institutions share a
            name (for example the two <strong>PQR Institute of Technology</strong> campuses), the location decides; if it is still
            unclear, an official confirms the institution before the complaint is linked. Automatic matching of informally written
            names is planned and not yet available.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="filter-bar">
          <input
            type="search"
            className="filter-select"
            style={{ width: '300px' }}
            placeholder="Search by name, district or state"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search institutions"
          />
          <select className="filter-select" value={get('region', 'ALL')} onChange={(e) => update({ region: e.target.value })} aria-label="Region">
            <option value="ALL">All regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="filter-select" value={get('stream', 'ALL')} onChange={(e) => update({ stream: e.target.value })} aria-label="Type of institution">
            <option value="ALL">All types</option>
            {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading && <LoadingState label="Loading institutions…" />}
        {!loading && error && <ErrorState message={error} details={details} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && <EmptyState title="No institutions match" message="Try a different name, district or state." />}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution Name</th>
                  <th>Location</th>
                  <th>AICTE Permanent ID</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Resolved</th>
                  <th>Overdue</th>
                  <th>By Bureau</th>
                </tr>
              </thead>
              <tbody>
                {data.map((inst) => {
                  const s = inst.case_summary;
                  return (
                    <tr key={inst.institution_id}>
                      <td>
                        <Link className="table-link" to={`/institutions/${inst.institution_id}`}>{inst.name}</Link>
                        <div className="row-muted">{inst.stream}</div>
                        {inst.shares_name_with > 0 && (
                          <div className="warn-text">
                            <AlertTriangle size={10} /> Same name as {inst.shares_name_with} other institution{inst.shares_name_with > 1 ? 's' : ''} – check location
                          </div>
                        )}
                      </td>
                      <td>{inst.district}, {inst.state}<div className="row-muted">{inst.region} region</div></td>
                      <td>{verifiedAicteId(inst) || <span className="row-muted">Not verified</span>}</td>
                      <td><strong>{formatNumber(s.total_cases)}</strong></td>
                      <td>{formatNumber(s.pending_cases)}</td>
                      <td>{formatNumber(s.resolved_cases)}</td>
                      <td>{s.overdue_cases > 0 ? <span style={{ color: 'var(--tone-red)', fontWeight: 600 }}>{s.overdue_cases}</span> : 0}</td>
                      <td>
                        {BUREAU_ORDER.filter((b) => s.cases_by_bureau[b]).map((b) => `${b} ${s.cases_by_bureau[b]}`).join(' · ') || '—'}
                        {s.multiple_bureaus_active && <div className="warn-text">Active in more than one Bureau</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && meta && (
          <Pagination
            meta={meta}
            noun="institutions"
            onPageChange={(p) => update({ page: p }, { resetPage: false })}
            onLimitChange={(l) => update({ limit: l })}
          />
        )}
      </div>
    </div>
  );
}
