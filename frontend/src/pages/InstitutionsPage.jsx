import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import SyntheticNotice from '../components/SyntheticNotice';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchInstitutions } from '../services/api';
import { REGIONS, STREAMS } from '../utils/format';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
          <h2>Institution Profiles</h2>
          <p>Institution-centric view: every institution with its cases across all Bureaus</p>
        </div>
      </div>

      <SyntheticNotice provenance={data ? Object.fromEntries(data.map((i) => [i.provenance, 1])) : undefined} overdue={meta?.overdue} />

      {/* Engine D1 explainer: planned, not yet implemented */}
      <div className="content-card" style={{ borderLeft: '4px solid var(--primary-navy)' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Engine D1: Institution Identity Resolution <span className="row-muted">(planned – roadmap phase 4, not yet implemented)</span>
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Incoming complaints often name institutions informally (e.g. <em>"ABC Engg Coll Pune"</em>). D1 will match exact
            permanent IDs, normalise names and score fuzzy matches. Only confident matches will be linked automatically;
            ambiguous ones (such as the two <strong>PQR Institute of Technology</strong> campuses below) will go to a
            verification queue for an official to decide. Today, cases whose institution is not verified are stored without
            an institution link and are excluded from overlap detection.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="filter-bar">
          <input
            type="search"
            className="filter-select"
            style={{ width: '300px' }}
            placeholder="Name, district, state, institution or AICTE ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search institutions"
          />
          <select className="filter-select" value={get('region', 'ALL')} onChange={(e) => update({ region: e.target.value })} aria-label="Region">
            <option value="ALL">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="filter-select" value={get('stream', 'ALL')} onChange={(e) => update({ stream: e.target.value })} aria-label="Stream">
            <option value="ALL">All Streams</option>
            {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading && <LoadingState label="Loading institutions…" />}
        {!loading && error && <ErrorState message={error} details={details} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && <EmptyState title="No institutions match" message="Try a different name, district or AICTE ID." />}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution ID</th>
                  <th>AICTE Permanent ID</th>
                  <th>Institution Name</th>
                  <th>Stream</th>
                  <th>District / State</th>
                  <th>Region</th>
                  <th>Cases (active / total)</th>
                  <th>Bureaus with active cases</th>
                </tr>
              </thead>
              <tbody>
                {data.map((inst) => (
                  <tr key={inst.institution_id}>
                    <td className="cell-code">{inst.institution_id}</td>
                    <td className="cell-code">{inst.aicte_permanent_id}</td>
                    <td>
                      <Link className="table-link" to={`/institutions/${inst.institution_id}`}>{inst.name}</Link>
                      {inst.shares_name_with > 0 && (
                        <div className="warn-text">
                          <AlertTriangle size={10} /> Same name as {inst.shares_name_with} other institution{inst.shares_name_with > 1 ? 's' : ''} – check location
                        </div>
                      )}
                    </td>
                    <td>{inst.stream}</td>
                    <td>{inst.district}, {inst.state}</td>
                    <td>{inst.region}</td>
                    <td>
                      <strong>{inst.case_summary.active_cases}</strong> / {inst.case_summary.total_cases}
                      {inst.case_summary.overdue_cases > 0 && <div className="warn-text">{inst.case_summary.overdue_cases} overdue</div>}
                    </td>
                    <td>
                      {inst.case_summary.active_bureaus.length ? inst.case_summary.active_bureaus.join(', ') : '—'}
                      {inst.case_summary.multiple_bureaus_active && <div className="warn-text">Multiple Bureaus active</div>}
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
            noun="institutions"
            onPageChange={(p) => update({ page: p }, { resetPage: false })}
            onLimitChange={(l) => update({ limit: l })}
          />
        )}
      </div>
    </div>
  );
}
