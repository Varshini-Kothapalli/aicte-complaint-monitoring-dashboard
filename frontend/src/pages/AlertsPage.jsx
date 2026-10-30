import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchAttention } from '../services/api';
import { displayCaseId, formatDate, formatNumber, humanize, readableText } from '../utils/format';
import { AlarmClock, CalendarClock, UserPlus } from 'lucide-react';

const TABS = [
  { id: 'overdue', label: 'Overdue', icon: AlarmClock, empty: 'No complaints are overdue.' },
  { id: 'due_soon', label: 'Due within 7 days', icon: CalendarClock, empty: 'No complaints are due in the next 7 days.' },
  { id: 'unassigned', label: 'Awaiting assignment', icon: UserPlus, empty: 'Every complaint has an officer.' },
];

/** Level reached: 2 = regional / management, 1 = Bureau head, 0 = none. */
const levelOf = (text) => (/regional|management/i.test(text || '') ? 2 : /bureau head/i.test(text || '') ? 1 : 0);

function Escalation({ c }) {
  const recordedLevel = levelOf(c.recorded_escalation?.remarks);
  const recommendedLevel = levelOf(c.recommended_escalation);
  // Only recommend when the recorded history has not already reached that level.
  const showRecommendation = c.recommended_escalation && recommendedLevel > recordedLevel;
  return (
    <>
      {c.recorded_escalation && (
        <div className="esc-recorded">
          <span className="esc-tag esc-tag-recorded">Recorded</span>
          {formatDate(c.recorded_escalation.at)}: {readableText(c.recorded_escalation.remarks)}
        </div>
      )}
      {showRecommendation && (
        <div className="esc-recommended" style={{ marginTop: c.recorded_escalation ? '0.25rem' : 0 }}>
          <span className="esc-tag esc-tag-recommended">Recommended</span>
          Escalate to {c.recommended_escalation.toLowerCase()}
        </div>
      )}
      {!c.recorded_escalation && !showRecommendation && <span className="row-muted">None needed yet</span>}
    </>
  );
}

export default function AlertsPage() {
  const [params, setParams] = useSearchParams();
  const section = TABS.some((t) => t.id === params.get('section')) ? params.get('section') : 'overdue';
  const query = { section, page: params.get('page') || '1', limit: params.get('limit') || '20' };
  const { data, meta, loading, error, reload } = useApiResource((opts) => fetchAttention(query, opts), [JSON.stringify(query)]);
  const counts = meta?.counts;
  const asOf = meta?.reference?.as_of;

  const setParam = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    setParams(next);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Pending Actions &amp; Overdue Complaints</h2>
          <p>Complaints that need action: past their target date, due soon, or still without an officer</p>
        </div>
        {asOf && <span className="row-muted">Dates counted to {formatDate(`${asOf}T00:00:00Z`)}</span>}
      </div>

      <div className="content-card" style={{ borderLeft: '4px solid var(--tone-red)' }}>
        <div className="card-body" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text-main)' }}>Escalation rule:</strong> more than 7 days overdue – Bureau head; more than 21 days
          overdue – regional officer and senior management.{' '}
          <span className="esc-tag esc-tag-recorded">Recorded</span> means an escalation is written in the complaint's history.{' '}
          <span className="esc-tag esc-tag-recommended">Recommended</span> is what the rule suggests today; it is shown for information
          only. Automatic escalation and notifications are not switched on in this prototype, so nothing is sent.
        </div>
      </div>

      <div className="content-card">
        <div className="tab-bar" role="tablist" aria-label="Pending actions">
          {TABS.map((t) => {
            const Icon = t.icon;
            const n = counts ? counts[t.id] : null;
            return (
              <button key={t.id} type="button" role="tab" className="tab-btn" aria-selected={section === t.id} onClick={() => setParam({ section: t.id, page: null })}>
                <Icon size={14} /> {t.label} {n !== null && n !== undefined && <span className="tab-count">{formatNumber(n)}</span>}
              </button>
            );
          })}
        </div>

        {counts && section === 'overdue' && counts.escalation_recommended > 0 && (
          <div className="row-muted" style={{ padding: '0.625rem 1.25rem' }}>
            {formatNumber(counts.escalation_recommended)} overdue complaints are more than 7 days late and should be escalated.
          </div>
        )}

        {loading && <LoadingState label="Loading…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data?.length === 0 && <EmptyState title="Nothing here" message={TABS.find((t) => t.id === section).empty} />}

        {!loading && !error && data?.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Institution</th>
                  <th>Bureau</th>
                  <th>Responsible Officer</th>
                  <th>Target Date</th>
                  <th>{section === 'overdue' ? 'Days Overdue' : section === 'due_soon' ? 'Due In' : 'Received'}</th>
                  <th>Required Next Action</th>
                  {section === 'overdue' && <th>Escalation</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.case_id}>
                    <td>
                      <Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{displayCaseId(c.case_id)}</Link>
                      <div className="row-muted">{humanize(c.category)}</div>
                    </td>
                    <td>{c.institution?.name || c.raw_institution_name || '—'}</td>
                    <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                    <td>
                      {c.assigned_officer_display ? (
                        <>
                          {c.assigned_officer_display.name}
                          {c.assigned_officer_display.designation && <div className="row-muted">{c.assigned_officer_display.designation}</div>}
                        </>
                      ) : <span className="row-muted">Not yet assigned – Bureau head to assign</span>}
                    </td>
                    <td>{formatDate(c.expected_disposal_date)}</td>
                    <td>
                      {section === 'overdue' && <Badge status="overdue">{c.days_overdue} days</Badge>}
                      {section === 'due_soon' && (c.days_until_due === 0 ? <strong>Today</strong> : `${c.days_until_due} day${c.days_until_due === 1 ? '' : 's'}`)}
                      {section === 'unassigned' && formatDate(c.receipt_date)}
                    </td>
                    <td>{c.next_action || (c.status === 'Received' ? 'Assign officer' : '—')}</td>
                    {section === 'overdue' && <td style={{ maxWidth: 280 }}><Escalation c={c} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && meta && (
          <Pagination meta={meta} noun="complaints" onPageChange={(p) => setParam({ page: p })} onLimitChange={(l) => setParam({ limit: l, page: null })} />
        )}
      </div>
    </div>
  );
}
