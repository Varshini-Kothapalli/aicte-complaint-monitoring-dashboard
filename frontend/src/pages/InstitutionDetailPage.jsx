import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import SyntheticNotice from '../components/SyntheticNotice';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchInstitution } from '../services/api';
import { formatDate, humanize } from '../utils/format';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function InstitutionDetailPage() {
  const { institutionId } = useParams();
  const { data: inst, meta, loading, error, code, reload } = useApiResource((opts) => fetchInstitution(institutionId, opts), [institutionId]);
  const summary = inst?.case_summary;

  return (
    <div>
      <Link to="/institutions" className="back-link"><ArrowLeft size={14} /> All institutions</Link>

      {loading && <div className="content-card"><LoadingState label="Loading institution profile…" /></div>}
      {!loading && error && code === 'INSTITUTION_NOT_FOUND' && (
        <div className="content-card"><EmptyState title="Institution not found" message={`There is no institution with ID ${institutionId}.`} /></div>
      )}
      {!loading && error && code !== 'INSTITUTION_NOT_FOUND' && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && inst && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h2>{inst.name}</h2>
              <p>{inst.district}, {inst.state} · {inst.stream} · {inst.ownership} · Est. {inst.established}</p>
            </div>
            <ProvenanceTag type={inst.provenance} />
          </div>

          <SyntheticNotice provenance={{ [inst.provenance]: 1 }} overdue={meta?.overdue} />

          {inst.same_name_institutions.length > 0 && (
            <div className="notice-bar" style={{ color: '#92400E', background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <AlertTriangle size={16} />
              <span>
                Another institution has the same name:{' '}
                {inst.same_name_institutions.map((o, i) => (
                  <React.Fragment key={o.institution_id}>
                    {i > 0 && ', '}
                    <Link className="table-link" to={`/institutions/${o.institution_id}`}>{o.institution_id}</Link> ({o.district}, {o.state})
                  </React.Fragment>
                ))}
                . Complaints that give only the name must be matched using location or AICTE ID, never merged automatically.
              </span>
            </div>
          )}

          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total cases</span>
              <div className="metric-value">{summary.total_cases}</div>
              <div className="metric-footer"><ProvenanceTag type="DERIVED" /></div>
            </div>
            <div className="metric-card">
              <span className="metric-label">Active cases</span>
              <div className="metric-value">{summary.active_cases}</div>
              <div className="metric-footer"><ProvenanceTag type="DERIVED" /></div>
            </div>
            <div className={`metric-card ${summary.overdue_cases ? 'metric-alert' : ''}`}>
              <span className="metric-label">Overdue (snapshot)</span>
              <div className="metric-value">{summary.overdue_cases}</div>
              <div className="metric-footer"><ProvenanceTag type="DERIVED" /></div>
            </div>
            <div className="metric-card">
              <span className="metric-label">Bureaus with active cases</span>
              <div className="metric-value">{summary.active_bureaus.length}</div>
              <div className="metric-footer">
                <ProvenanceTag type="DERIVED" />
                <span className="metric-subtext">{summary.active_bureaus.join(', ') || 'none'}</span>
              </div>
            </div>
          </div>

          {summary.multiple_bureaus_active && (
            <div className="notice-bar" style={{ color: '#1E3A8A', background: '#EFF6FF', borderColor: '#BFDBFE' }}>
              <AlertTriangle size={16} />
              <span>
                More than one Bureau is handling active cases at this institution. This is a coordination signal only: it does not
                mean the cases are duplicates or related. Overlap scoring and official review are planned for roadmap phase 5.
              </span>
            </div>
          )}

          <div className="content-card">
            <div className="card-header"><span className="card-title">Cases by Bureau</span></div>
            <div className="card-body">
              {summary.by_bureau.length === 0 ? (
                <p className="detail-text">No cases recorded for this institution.</p>
              ) : (
                <div className="bureau-summary">
                  {summary.by_bureau.map((b) => (
                    <div key={b.bureau} className="bureau-summary-item">
                      <Badge status={b.bureau}>{b.bureau}</Badge>
                      <strong>{b.active} active</strong>
                      {b.total} total · {b.overdue} overdue
                      <div className="row-muted">
                        {Object.entries(b.by_status).filter(([, n]) => n > 0).map(([s, n]) => `${s}: ${n}`).join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">All cases at this institution ({inst.cases.length})</span>
              <Link className="btn btn-outline" to={`/cases?institution_id=${inst.institution_id}`}>Open in Cases Explorer</Link>
            </div>
            {inst.cases.length === 0 ? (
              <EmptyState title="No cases" />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Case ID</th><th>Bureau</th><th>Category</th><th>Status</th><th>Received</th><th>Expected Disposal</th><th>Officer</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {inst.cases.map((c) => (
                      <tr key={c.case_id}>
                        <td><Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{c.case_id}</Link></td>
                        <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                        <td>
                          {humanize(c.category)}
                          {humanize(c.category).toLowerCase() !== c.subject.toLowerCase() && <div className="row-muted">{c.subject}</div>}
                        </td>
                        <td>
                          <Badge status={c.status} />
                          {c.is_overdue && <span style={{ marginLeft: '0.25rem' }}><Badge status="overdue">Overdue</Badge></span>}
                        </td>
                        <td>{formatDate(c.receipt_date)}</td>
                        <td>{formatDate(c.expected_disposal_date)}</td>
                        <td className="cell-code" style={{ fontSize: '0.75rem' }}>{c.assigned_officer || '—'}</td>
                        <td><ProvenanceTag type={c.provenance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
