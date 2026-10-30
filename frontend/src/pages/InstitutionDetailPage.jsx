import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import MetricCard from '../components/MetricCard';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchInstitution, fetchDuplicates } from '../services/api';
import {
  formatDate, humanize, statusLabel, displayCaseId, displayInstitutionId, verifiedAicteId, formatNumber,
} from '../utils/format';
import { ArrowLeft, AlertTriangle, FolderKanban, Hourglass, CheckCircle2, AlarmClock } from 'lucide-react';

export default function InstitutionDetailPage() {
  const { institutionId } = useParams();
  const { data: inst, loading, error, code, reload } = useApiResource((opts) => fetchInstitution(institutionId, opts), [institutionId]);
  const dups = useApiResource((opts) => fetchDuplicates({ institution_id: institutionId, status: 'pending', limit: 1 }, opts), [institutionId]);
  const summary = inst?.case_summary;
  const pendingDuplicates = dups.meta?.total || 0;

  return (
    <div>
      <Link to="/institutions" className="back-link"><ArrowLeft size={14} /> All institutions</Link>

      {loading && <div className="content-card"><LoadingState label="Loading institution…" /></div>}
      {!loading && error && code === 'INSTITUTION_NOT_FOUND' && (
        <div className="content-card"><EmptyState title="Institution not found" message={`There is no institution ${displayInstitutionId(institutionId)}.`} /></div>
      )}
      {!loading && error && code !== 'INSTITUTION_NOT_FOUND' && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && inst && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h2>{inst.name}</h2>
              <p>
                {inst.district}, {inst.state} · {inst.region} region · {inst.stream} · {inst.ownership} · Est. {inst.established}
              </p>
              <p className="row-muted">
                AICTE Permanent ID: {verifiedAicteId(inst) || 'not verified'} · Reference {displayInstitutionId(inst.institution_id)}
              </p>
            </div>
          </div>

          {inst.same_name_institutions.length > 0 && (
            <div className="notice-bar" style={{ color: 'var(--tone-gold)', background: 'var(--accent-gold-light)', borderColor: 'var(--color-accent)' }}>
              <AlertTriangle size={16} />
              <span>
                Another institution has the same name:{' '}
                {inst.same_name_institutions.map((o, i) => (
                  <React.Fragment key={o.institution_id}>
                    {i > 0 && ', '}
                    <Link className="table-link" to={`/institutions/${o.institution_id}`}>{o.district}, {o.state}</Link>
                  </React.Fragment>
                ))}
                . Check the location before linking a complaint to this institution.
              </span>
            </div>
          )}

          <div className="metrics-grid">
            <MetricCard label="Total Complaints" value={formatNumber(summary.total_cases)} icon={FolderKanban} tone="navy" />
            <MetricCard label="Pending" value={formatNumber(summary.pending_cases)} icon={Hourglass} tone="orange" subtext={`${summary.in_progress_cases} more in progress`} />
            <MetricCard label="Resolved" value={formatNumber(summary.resolved_cases)} icon={CheckCircle2} tone="green" />
            <MetricCard label="Overdue" value={formatNumber(summary.overdue_cases)} icon={AlarmClock} tone="red" />
          </div>

          {summary.multiple_bureaus_active && (
            <div className="notice-bar" style={{ color: 'var(--color-primary)', background: '#EEF3FA', borderColor: 'var(--color-border)' }}>
              <AlertTriangle size={16} />
              <span>
                {summary.active_bureaus.length} Bureaus ({summary.active_bureaus.join(', ')}) have open complaints about this institution.
                This does not mean the complaints are duplicates.{' '}
                {pendingDuplicates > 0 ? (
                  <Link className="table-link" to={`/overlap?institution_id=${inst.institution_id}`}>
                    {pendingDuplicates} possible duplicate pair{pendingDuplicates > 1 ? 's' : ''} awaiting review
                  </Link>
                ) : 'No possible duplicates are awaiting review.'}
              </span>
            </div>
          )}

          <div className="content-card">
            <div className="card-header"><span className="card-title">Complaints by Bureau</span></div>
            <div className="card-body">
              {summary.by_bureau.length === 0 ? (
                <p className="detail-text">No complaints recorded for this institution.</p>
              ) : (
                <div className="bureau-summary">
                  {summary.by_bureau.map((b) => (
                    <Link key={b.bureau} className="bureau-summary-item table-link" style={{ fontWeight: 400 }} to={`/cases?institution_id=${inst.institution_id}&bureau=${b.bureau}`}>
                      <Badge status={b.bureau}>{b.bureau}</Badge>
                      <strong>{b.total} complaint{b.total === 1 ? '' : 's'}</strong>
                      {b.active} open · {b.total - b.active} resolved · {b.overdue} overdue
                      <div className="row-muted">
                        {Object.entries(b.by_status).filter(([, n]) => n > 0).map(([s, n]) => `${statusLabel(s)}: ${n}`).join(' · ')}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">All complaints about this institution ({inst.cases.length})</span>
              <Link className="btn btn-outline" to={`/cases?institution_id=${inst.institution_id}`}>Search these complaints</Link>
            </div>
            {inst.cases.length === 0 ? (
              <EmptyState title="No complaints" />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Case ID</th><th>Complaint Subject</th><th>Bureau</th><th>Status</th><th>Received</th><th>Target Resolution Date</th></tr>
                  </thead>
                  <tbody>
                    {inst.cases.map((c) => (
                      <tr key={c.case_id}>
                        <td><Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{displayCaseId(c.case_id)}</Link></td>
                        <td>
                          {c.subject}
                          {humanize(c.category).toLowerCase() !== c.subject.toLowerCase() && <div className="row-muted">{humanize(c.category)}</div>}
                        </td>
                        <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                        <td>
                          <Badge status={c.status} />
                          {c.is_overdue && <div style={{ marginTop: '0.25rem' }}><Badge status="overdue">Overdue</Badge></div>}
                        </td>
                        <td>{formatDate(c.receipt_date)}</td>
                        <td>{formatDate(c.expected_disposal_date)}</td>
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
