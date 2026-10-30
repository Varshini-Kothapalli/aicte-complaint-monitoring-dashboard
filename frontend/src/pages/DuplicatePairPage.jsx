import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import DuplicateDecisionDialog from '../components/DuplicateDecisionDialog';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchDuplicate } from '../services/api';
import { displayCaseId, formatDate, humanize, statusLabel, readableText, formatDateTime } from '../utils/format';
import { REVIEW_STATUS, MATCH_STRENGTH } from '../utils/duplicates';
import { ArrowLeft, Check, X } from 'lucide-react';

function ComplaintPanel({ title, c }) {
  if (!c) return <div className="content-card"><EmptyState title="Complaint not found" /></div>;
  return (
    <div className="content-card">
      <div className="card-header">
        <span className="card-title">{title}: <span className="cell-code">{displayCaseId(c.case_id)}</span></span>
        <Badge status={c.bureau}>{c.bureau}</Badge>
      </div>
      <div className="card-body">
        <dl className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div><dt>Subject</dt><dd>{c.subject}</dd></div>
          <div><dt>Complaint type</dt><dd>{humanize(c.category)}</dd></div>
          <div><dt>Status</dt><dd>{statusLabel(c.status)}{c.is_overdue && ' (overdue)'}</dd></div>
          <div><dt>Officer</dt><dd>{c.assigned_officer_display?.name || 'Not yet assigned'}</dd></div>
          <div><dt>Received</dt><dd>{formatDate(c.receipt_date)}</dd></div>
          <div><dt>Target resolution date</dt><dd>{formatDate(c.expected_disposal_date)}</dd></div>
        </dl>
        <p className="detail-text" style={{ marginTop: '1rem' }}>{readableText(c.description)}</p>
        <Link className="table-link" to={`/cases/${c.case_id}`}>Open full complaint and history</Link>
      </div>
    </div>
  );
}

export default function DuplicatePairPage() {
  const { pairKey } = useParams();
  const [dialog, setDialog] = useState(null);
  const { data: p, loading, error, code, reload } = useApiResource((opts) => fetchDuplicate(pairKey, opts), [pairKey]);

  return (
    <div>
      <Link to="/overlap" className="back-link"><ArrowLeft size={14} /> Possible duplicate complaints</Link>
      {loading && <div className="content-card"><LoadingState label="Loading complaints…" /></div>}
      {!loading && error && code === 'PAIR_NOT_FOUND' && (
        <div className="content-card">
          <EmptyState title="These complaints are not flagged as possible duplicates" message="The pair may not have been checked yet, or it did not meet the threshold for review." />
        </div>
      )}
      {!loading && error && code !== 'PAIR_NOT_FOUND' && <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && p && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h2>Compare complaints</h2>
              <p>{p.institution?.name}{p.institution ? `, ${p.institution.district}` : ''}</p>
            </div>
            <span className={`status-badge ${REVIEW_STATUS[p.official_decision].cls}`}>{REVIEW_STATUS[p.official_decision].label}</span>
          </div>

          <div className="content-card">
            <div className="card-header">
              <span className="card-title">
                Similarity score {p.score.toFixed(2)}{' '}
                {MATCH_STRENGTH[p.band] && <span className={`status-badge ${MATCH_STRENGTH[p.band].cls}`}>{MATCH_STRENGTH[p.band].label}</span>}
              </span>
              {p.official_decision === 'pending' && (
                <div className="action-group">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog('confirmed_linked')}><Check size={12} /> Confirm Related</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setDialog('dismissed_unrelated')}><X size={12} /> Mark as Unrelated</button>
                </div>
              )}
            </div>
            <div className="card-body">
              <strong style={{ fontSize: '0.8125rem' }}>Reasons for the match</strong>
              <ul className="reason-list" style={{ marginTop: '0.375rem' }}>{p.reasons.map((r) => <li key={r}>{readableText(r)}</li>)}</ul>
              {p.official_decision !== 'pending' && (
                <p className="detail-text" style={{ marginTop: '0.75rem' }}>
                  <strong>{REVIEW_STATUS[p.official_decision].label}</strong> by {p.decided_by_display?.name}
                  {p.decided_by_display?.designation ? ` (${p.decided_by_display.designation})` : ''} on {formatDateTime(p.decided_at)}.
                  {' '}Note: {p.decision_note}
                </p>
              )}
            </div>
          </div>

          <div className="compare-grid">
            <ComplaintPanel title="Complaint A" c={p.complaint_a} />
            <ComplaintPanel title="Complaint B" c={p.complaint_b} />
          </div>
        </>
      )}

      {dialog && p && (
        <DuplicateDecisionDialog pair={p} decision={dialog} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload(); }} />
      )}
    </div>
  );
}
