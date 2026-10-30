import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import useDirectory from '../hooks/useDirectory';
import { fetchCase } from '../services/api';
import {
  formatDate, formatDateTime, humanize, statusLabel, displayCaseId, displayInstitutionId, verifiedAicteId, readableText,
} from '../utils/format';
import { ArrowLeft } from 'lucide-react';

const ACTION_LABELS = {
  created: 'Registered', assigned: 'Assigned', status_change: 'Status updated', document: 'Document added',
  transfer: 'Transferred', escalation: 'Escalation recorded', coordination: 'Duplicate review decision',
};

function Field({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

function Person({ display }) {
  if (!display) return 'Not yet assigned';
  return (
    <>
      {display.name}
      {display.designation && <div className="row-muted">{display.designation}</div>}
    </>
  );
}

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const { nameOf } = useDirectory();
  const { data: c, loading, error, code, reload } = useApiResource((opts) => fetchCase(caseId, opts), [caseId]);
  const text = (s) => readableText(s, nameOf);

  return (
    <div>
      <Link to="/cases" className="back-link"><ArrowLeft size={14} /> All complaints</Link>

      {loading && <div className="content-card"><LoadingState label="Loading complaint…" /></div>}
      {!loading && error && code === 'CASE_NOT_FOUND' && (
        <div className="content-card"><EmptyState title="Complaint not found" message={`There is no complaint with number ${displayCaseId(caseId)}.`} /></div>
      )}
      {!loading && error && code !== 'CASE_NOT_FOUND' && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && c && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h2><span className="cell-code">{displayCaseId(c.case_id)}</span> – {c.subject}</h2>
              <p>{c.bureau_info?.name || c.bureau} · {humanize(c.category)}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Badge status={c.status} />
              {c.is_overdue && <Badge status="overdue">Overdue</Badge>}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header"><span className="card-title">Complaint details</span></div>
            <div className="card-body">
              <dl className="detail-grid">
                <Field label="Case ID"><span className="cell-code">{displayCaseId(c.case_id)}</span></Field>
                <Field label="Received on">{formatDate(c.receipt_date)}</Field>
                <Field label="Complaint type">{humanize(c.category)}</Field>
                <Field label="Status">{statusLabel(c.status)}</Field>
                <Field label="Bureau / Cell">{c.bureau_info ? `${c.bureau_info.name} (${c.bureau})` : c.bureau}</Field>
                <Field label="Assigned officer"><Person display={c.assigned_officer_display} /></Field>
                <Field label="Last action">{text(c.last_action)}{c.last_action_at && <div className="row-muted">{formatDate(c.last_action_at)}</div>}</Field>
                <Field label="Next action">{c.next_action || (c.status === 'Disposed' ? 'None – resolved' : '—')}</Field>
                <Field label="Target resolution date">{formatDate(c.expected_disposal_date)}</Field>
                <Field label="Region">{c.region}</Field>
                <Field label="Transferred between Bureaus">{c.was_transferred ? 'Yes' : 'No'}</Field>
                <Field label="References">{c.refs?.length ? c.refs.map((r) => text(r)).join(', ') : '—'}</Field>
              </dl>
            </div>
          </div>

          <div className="content-card">
            <div className="card-header"><span className="card-title">Institution</span></div>
            <div className="card-body">
              {c.institution ? (
                <dl className="detail-grid">
                  <Field label="Name"><Link className="table-link" to={`/institutions/${c.institution.institution_id}`}>{c.institution.name}</Link></Field>
                  <Field label="Location">{c.institution.district}, {c.institution.state}</Field>
                  <Field label="Institution reference">{displayInstitutionId(c.institution.institution_id)}</Field>
                  <Field label="AICTE Permanent ID">{verifiedAicteId(c.institution) || <span className="row-muted">Not verified</span>}</Field>
                </dl>
              ) : (
                <p className="detail-text">
                  Institution named in the complaint: <strong>{c.raw_institution_name || 'not given'}</strong>. The institution has not yet
                  been verified, so this complaint is not linked to any institution and is not included in duplicate review.
                </p>
              )}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header"><span className="card-title">Complaint description</span></div>
            <div className="card-body"><p className="detail-text">{text(c.description)}</p></div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">Action history ({c.actions.length})</span>
              <span className="row-muted">Oldest first · entries cannot be edited</span>
            </div>
            {c.actions.length === 0 ? (
              <EmptyState title="No actions recorded" />
            ) : (
              <ol className="timeline">
                {c.actions.map((a, i) => (
                  <li key={`${a.ts}-${i}`} className={`timeline-${a.action_type}`}>
                    <div className="timeline-meta">
                      {formatDateTime(a.ts)} · {ACTION_LABELS[a.action_type] || humanize(a.action_type)} · {a.actor_display?.name || a.actor_name || a.actor}
                      {a.from_status && a.to_status && a.from_status !== a.to_status && ` · ${statusLabel(a.from_status)} → ${statusLabel(a.to_status)}`}
                    </div>
                    <div className="timeline-remarks">{text(a.remarks)}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {c.transfers.length > 0 && (
            <div className="content-card">
              <div className="card-header"><span className="card-title">Transfers between Bureaus</span></div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>From</th><th>To</th><th>Reason</th><th>Requested</th><th>Accepted</th></tr></thead>
                  <tbody>
                    {c.transfers.map((t) => (
                      <tr key={t.transfer_key}>
                        <td>{t.from_bureau}</td>
                        <td>{t.to_bureau}</td>
                        <td>{t.reason}</td>
                        <td>{formatDate(t.requested_at)}<div className="row-muted">{t.requested_by_display?.name}</div></td>
                        <td>{t.accepted_at ? formatDate(t.accepted_at) : 'Not yet accepted'}<div className="row-muted">{t.accepted_by_display?.name}</div></td>
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
