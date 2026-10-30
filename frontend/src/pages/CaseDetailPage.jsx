import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import SyntheticNotice from '../components/SyntheticNotice';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchCase } from '../services/api';
import { formatDate, formatDateTime, humanize } from '../utils/format';
import { ArrowLeft } from 'lucide-react';

function Field({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const { data: c, meta, loading, error, code, reload } = useApiResource((opts) => fetchCase(caseId, opts), [caseId]);

  return (
    <div>
      <Link to="/cases" className="back-link"><ArrowLeft size={14} /> All cases</Link>

      {loading && <div className="content-card"><LoadingState label={`Loading ${caseId}…`} /></div>}
      {!loading && error && code === 'CASE_NOT_FOUND' && (
        <div className="content-card"><EmptyState title="Case not found" message={`There is no case with ID ${caseId}.`} /></div>
      )}
      {!loading && error && code !== 'CASE_NOT_FOUND' && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && c && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h2><span className="cell-code">{c.case_id}</span> – {c.subject}</h2>
              <p>{c.bureau_info?.name || c.bureau} · {humanize(c.category)}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Badge status={c.status} />
              {c.is_overdue && <Badge status="overdue">Overdue</Badge>}
            </div>
          </div>

          <SyntheticNotice provenance={{ [c.provenance]: 1 }} overdue={meta?.overdue} />

          <div className="content-card">
            <div className="card-header"><span className="card-title">Case tracking</span></div>
            <div className="card-body">
              <dl className="detail-grid">
                <Field label="Case ID"><span className="cell-code">{c.case_id}</span></Field>
                <Field label="Receipt date">{formatDate(c.receipt_date)}</Field>
                <Field label="Category">{humanize(c.category)}</Field>
                <Field label="Status">{c.status}</Field>
                <Field label="Bureau / Cell">{c.bureau_info ? `${c.bureau_info.name} (${c.bureau})` : c.bureau}</Field>
                <Field label="Assigned officer">
                  {c.assigned_officer_info ? `${c.assigned_officer_info.display_name} (${c.assigned_officer})` : c.assigned_officer || 'Not yet assigned'}
                </Field>
                <Field label="Last action">{c.last_action}{c.last_action_at && <div className="row-muted">{formatDateTime(c.last_action_at)}</div>}</Field>
                <Field label="Next action">{c.next_action || (c.status === 'Disposed' ? 'None (disposed)' : '—')}</Field>
                <Field label="Expected disposal">{formatDate(c.expected_disposal_date)}</Field>
                <Field label="Region">{c.region}</Field>
                <Field label="Transferred">{c.was_transferred ? 'Yes' : 'No'}</Field>
                <Field label="References">{c.refs?.length ? c.refs.join(', ') : '—'}</Field>
              </dl>
            </div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">Institution</span>
            </div>
            <div className="card-body">
              {c.institution ? (
                <dl className="detail-grid">
                  <Field label="Name"><Link className="table-link" to={`/institutions/${c.institution.institution_id}`}>{c.institution.name}</Link></Field>
                  <Field label="Institution ID"><span className="cell-code">{c.institution.institution_id}</span></Field>
                  <Field label="AICTE Permanent ID (synthetic)"><span className="cell-code">{c.institution.aicte_permanent_id}</span></Field>
                  <Field label="Location">{c.institution.district}, {c.institution.state}</Field>
                </dl>
              ) : (
                <p className="detail-text">
                  Institution named in the complaint: <strong>{c.raw_institution_name || 'not given'}</strong>. Identity status:{' '}
                  <strong>{humanize(c.identity_status)}</strong>. This case is not linked to any institution until an official
                  verifies the identity, and it is excluded from overlap detection until then.
                </p>
              )}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header"><span className="card-title">Description</span></div>
            <div className="card-body"><p className="detail-text">{c.description}</p></div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">Action history ({c.actions.length})</span>
              <span className="row-muted">Chronological, append-only</span>
            </div>
            {c.actions.length === 0 ? (
              <EmptyState title="No actions recorded" />
            ) : (
              <ol className="timeline">
                {c.actions.map((a, i) => (
                  <li key={`${a.ts}-${i}`} className={`timeline-${a.action_type}`}>
                    <div className="timeline-meta">
                      {formatDateTime(a.ts)} · {humanize(a.action_type)} · {a.actor_name || a.actor}
                      {a.from_status && a.to_status && a.from_status !== a.to_status && ` · ${a.from_status} → ${a.to_status}`}
                    </div>
                    <div className="timeline-remarks">{a.remarks}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {c.transfers.length > 0 && (
            <div className="content-card">
              <div className="card-header"><span className="card-title">Transfers</span></div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>From</th><th>To</th><th>Reason</th><th>Requested</th><th>Accepted</th><th>State</th></tr></thead>
                  <tbody>
                    {c.transfers.map((t) => (
                      <tr key={t.transfer_key}>
                        <td>{t.from_bureau}</td>
                        <td>{t.to_bureau}</td>
                        <td>{t.reason}</td>
                        <td>{formatDateTime(t.requested_at)}<div className="row-muted">{t.requested_by_name || t.requested_by}</div></td>
                        <td>{formatDateTime(t.accepted_at)}<div className="row-muted">{t.accepted_by_name || t.accepted_by}</div></td>
                        <td>{humanize(t.state)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
