import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import DuplicateDecisionDialog from '../components/DuplicateDecisionDialog';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchDuplicates } from '../services/api';
import { displayCaseId, displayInstitutionId, formatDate, readableText } from '../utils/format';
import { REVIEW_STATUS, MATCH_STRENGTH, pairPath } from '../utils/duplicates';
import { Check, X, Columns2 } from 'lucide-react';

function ComplaintCell({ c }) {
  if (!c) return '—';
  return (
    <>
      <Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{displayCaseId(c.case_id)}</Link>
      <div><Badge status={c.bureau}>{c.bureau}</Badge> <Badge status={c.status} /></div>
      <div className="row-muted">{c.subject}</div>
    </>
  );
}

export default function OverlapDetectionPage() {
  const [params, setParams] = useSearchParams();
  const get = (k, def = '') => params.get(k) ?? def;
  const [dialog, setDialog] = useState(null);
  const query = { page: get('page', '1'), limit: get('limit', '20'), status: get('status', 'pending') === 'all' ? '' : get('status', 'pending'), band: get('band'), institution_id: get('institution_id') };
  const { data, meta, loading, error, details, reload } = useApiResource((opts) => fetchDuplicates(query, opts), [JSON.stringify(query)]);

  function update(changes, { resetPage = true } = {}) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, String(v))));
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next);
  }

  const s = meta?.summary;
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Possible Duplicate Complaints</h2>
          <p>Complaints about the same institution, handled by different Bureaus, that may concern the same matter</p>
        </div>
      </div>

      <div className="content-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.375rem' }}>How suggestions are made</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            The system compares open complaints about the same institution that are with different Bureaus. It looks for a shared
            reference number, related complaint types, the same complainant, complaints received close together, and similar wording.
            The similarity score (0 to 1) summarises these checks, and the reasons are listed for every pair.{' '}
            <strong>A suggestion never merges, closes or transfers a complaint.</strong> Only an official's decision is recorded,
            and every decision is saved with the official's name, the time and the reason.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="filter-bar">
          <select className="filter-select" value={get('status', 'pending')} onChange={(e) => update({ status: e.target.value })} aria-label="Review status">
            <option value="pending">Awaiting review{s ? ` (${s.pending})` : ''}</option>
            <option value="confirmed_linked">Confirmed related{s ? ` (${s.confirmed_linked})` : ''}</option>
            <option value="dismissed_unrelated">Marked unrelated{s ? ` (${s.dismissed_unrelated})` : ''}</option>
            <option value="all">All</option>
          </select>
          <select className="filter-select" value={get('band')} onChange={(e) => update({ band: e.target.value })} aria-label="Match strength">
            <option value="">Any match strength</option>
            <option value="HIGH">Strong match</option>
            <option value="MEDIUM">Possible match</option>
          </select>
          {get('institution_id') && (
            <button type="button" className="btn btn-outline" onClick={() => update({ institution_id: '' })}>
              <X size={14} /> Institution {displayInstitutionId(get('institution_id'))}
            </button>
          )}
        </div>

        {loading && <LoadingState label="Loading possible duplicates…" />}
        {!loading && error && <ErrorState message={error} details={details} onRetry={reload} />}
        {!loading && !error && meta && !meta.scanned && (
          <EmptyState
            title="Duplicate review has not been run yet"
            message="An administrator runs the duplicate check after loading data (npm run duplicates:scan). Suggestions will appear here."
          />
        )}
        {!loading && !error && meta?.scanned && data.length === 0 && (
          <EmptyState title="Nothing to show" message="No complaint pairs match these filters." />
        )}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Complaint A</th>
                  <th>Complaint B</th>
                  <th>Institution</th>
                  <th>Similarity Score</th>
                  <th>Reason for Match</th>
                  <th>Review Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const st = REVIEW_STATUS[p.official_decision];
                  const strength = MATCH_STRENGTH[p.band];
                  return (
                    <tr key={p.pair_key}>
                      <td><ComplaintCell c={p.complaint_a} /></td>
                      <td><ComplaintCell c={p.complaint_b} /></td>
                      <td>
                        {p.institution ? <Link className="table-link" to={`/institutions/${p.institution_id}`}>{p.institution.name}</Link> : '—'}
                        {p.institution && <div className="row-muted">{p.institution.district}</div>}
                      </td>
                      <td>
                        <span className="match-strength">
                          <strong>{p.score.toFixed(2)}</strong>
                          {strength && <span className={`status-badge ${strength.cls}`}>{strength.label}</span>}
                        </span>
                      </td>
                      <td style={{ minWidth: 240, maxWidth: 340 }}>
                        <ul className="reason-list">{p.reasons.map((r) => <li key={r}>{readableText(r)}</li>)}</ul>
                      </td>
                      <td>
                        <span className={`status-badge ${st.cls}`}>{st.label}</span>
                        {p.decided_by_display && (
                          <div className="row-muted">{p.decided_by_display.name}, {formatDate(p.decided_at)}</div>
                        )}
                      </td>
                      <td>
                        <div className="action-group">
                          {p.official_decision === 'pending' && (
                            <>
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ pair: p, decision: 'confirmed_linked' })}>
                                <Check size={12} /> Confirm Related
                              </button>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDialog({ pair: p, decision: 'dismissed_unrelated' })}>
                                <X size={12} /> Mark as Unrelated
                              </button>
                            </>
                          )}
                          <Link className="btn btn-outline btn-sm" to={pairPath(p.pair_key)}>
                            <Columns2 size={12} /> View Both
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && meta?.scanned && (
          <Pagination
            meta={meta}
            noun="pairs"
            onPageChange={(pg) => update({ page: pg }, { resetPage: false })}
            onLimitChange={(l) => update({ limit: l })}
          />
        )}
      </div>

      {dialog && (
        <DuplicateDecisionDialog
          pair={dialog.pair}
          decision={dialog.decision}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); reload(); }}
        />
      )}
    </div>
  );
}
