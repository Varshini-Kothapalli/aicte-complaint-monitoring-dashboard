import React from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import Badge from '../components/Badge';
import { LoadingState, ErrorState, EmptyState } from '../components/DataState';
import useApiResource from '../hooks/useApiResource';
import { fetchDashboardSummary, fetchAttention } from '../services/api';
import {
  formatDate, formatNumber, formatMonth, statusLabel, displayCaseId, officerName, humanize,
} from '../utils/format';
import { FolderKanban, Hourglass, Loader, CheckCircle2, AlarmClock, Building2, Copy, ArrowRight } from 'lucide-react';

const STATUS_TONE = { Received: 'seg-orange', Assigned: 'seg-orange', 'Under Process': 'seg-blue', 'Action Initiated': 'seg-blue', Disposed: 'seg-green' };

/** Horizontal bars; each row may be split into coloured segments. */
function BarList({ rows, max, ariaLabel }) {
  return (
    <ul className="hbar-list" aria-label={ariaLabel}>
      {rows.map((r) => (
        <li key={r.label} className="hbar-row">
          <span className="hbar-label" title={r.label}>{r.label}</span>
          <span className="hbar-track" role="img" aria-label={`${r.label}: ${r.total}`}>
            {r.segments.map((s) => (
              <span key={s.cls} className={`hbar-seg ${s.cls}`} style={{ width: `${max ? (s.value / max) * 100 : 0}%` }} title={`${s.label}: ${s.value}`} />
            ))}
          </span>
          <span className="hbar-value">{formatNumber(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}

function Legend({ items }) {
  return (
    <div className="chart-legend">
      {items.map(([cls, label]) => <span key={label}><i className={cls} />{label}</span>)}
    </div>
  );
}

function MonthlyTrend({ months }) {
  const recent = months.slice(-12);
  const max = Math.max(1, ...recent.map((m) => Math.max(m.received, m.resolved)));
  return (
    <>
      <div className="column-chart" role="img" aria-label="Complaints received and resolved per month">
        {recent.map((m) => (
          <div key={m.month} className="column-group" title={`${formatMonth(m.month)}: ${m.received} received, ${m.resolved} now resolved`}>
            <div className="column-bars">
              <span className="column-bar seg-navy" style={{ height: `${(m.received / max) * 100}%` }} />
              <span className="column-bar seg-green" style={{ height: `${(m.resolved / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="column-axis" aria-hidden="true">{recent.map((m) => <span key={m.month}>{formatMonth(m.month)}</span>)}</div>
      <Legend items={[['seg-navy', 'Received in the month'], ['seg-green', 'Of these, now resolved']]} />
    </>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiResource((opts) => fetchDashboardSummary(opts), []);
  const overdueList = useApiResource((opts) => fetchAttention({ section: 'overdue', limit: 6 }, opts), []);

  if (loading) return <div className="content-card"><LoadingState label="Loading dashboard…" /></div>;
  if (error) return <div className="content-card"><ErrorState message={error} onRetry={reload} /></div>;

  const t = data.totals;
  const bureauMax = Math.max(...data.by_bureau.map((b) => b.total), 1);
  const statusMax = Math.max(...data.by_status.map((s) => s.count), 1);
  const regionRows = [...data.by_region].sort((a, b) => b.count - a.count);
  const regionMax = Math.max(...regionRows.map((r) => r.count), 1);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Complaint Monitoring Dashboard</h2>
          <p>Complaints about technical institutions across PGRC, the Regulation Bureau and the Approval Bureau</p>
        </div>
        <span className="row-muted">Figures as of {formatDate(`${data.reference.as_of}T00:00:00Z`)}</span>
      </div>

      <div className="metrics-grid metrics-grid-6">
        <MetricCard label="Total Complaints" value={formatNumber(t.total)} icon={FolderKanban} tone="navy" to="/cases" subtext="All Bureaus" />
        <MetricCard label="Pending" value={formatNumber(t.pending)} icon={Hourglass} tone="orange" to="/cases?status=Received,Assigned" subtext="Received or assigned" />
        <MetricCard label="In Progress" value={formatNumber(t.in_progress)} icon={Loader} tone="blue" to="/cases?status=Under%20Process,Action%20Initiated" subtext="Under process or action started" />
        <MetricCard label="Resolved" value={formatNumber(t.resolved)} icon={CheckCircle2} tone="green" to="/cases?status=Disposed" />
        <MetricCard label="Overdue" value={formatNumber(t.overdue)} icon={AlarmClock} tone="red" to="/alerts" subtext="Past target resolution date" />
        <MetricCard label="Monitored Institutions" value={formatNumber(t.institutions)} icon={Building2} tone="navy" to="/institutions" />
        <MetricCard
          label="Possible Duplicates"
          value={t.possible_duplicates === null ? '—' : formatNumber(t.possible_duplicates)}
          icon={Copy}
          tone="gold"
          to="/overlap"
          subtext={t.possible_duplicates === null ? 'Duplicate review not yet run' : 'Awaiting review'}
        />
      </div>

      <div className="chart-grid">
        <div className="content-card">
          <div className="card-header"><span className="card-title">Complaints by Bureau</span></div>
          <div className="card-body">
            <BarList
              ariaLabel="Complaints by Bureau"
              max={bureauMax}
              rows={data.by_bureau.map((b) => ({
                label: `${b.name} (${b.bureau})`,
                total: b.total,
                segments: [
                  { cls: 'seg-orange', label: 'Pending', value: b.pending },
                  { cls: 'seg-blue', label: 'In progress', value: b.in_progress },
                  { cls: 'seg-green', label: 'Resolved', value: b.resolved },
                ],
              }))}
            />
            <Legend items={[['seg-orange', 'Pending'], ['seg-blue', 'In progress'], ['seg-green', 'Resolved']]} />
            <p className="chart-caption">
              Overdue: {data.by_bureau.map((b) => `${b.bureau} ${b.overdue}`).join(' · ')}
            </p>
          </div>
        </div>

        <div className="content-card">
          <div className="card-header"><span className="card-title">Complaints by Status</span></div>
          <div className="card-body">
            <BarList
              ariaLabel="Complaints by status"
              max={statusMax}
              rows={data.by_status.map((s) => ({
                label: statusLabel(s.status),
                total: s.count,
                segments: [{ cls: STATUS_TONE[s.status], label: statusLabel(s.status), value: s.count }],
              }))}
            />
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="content-card">
          <div className="card-header"><span className="card-title">Complaints by Region</span></div>
          <div className="card-body">
            <BarList
              ariaLabel="Complaints by region"
              max={regionMax}
              rows={regionRows.map((r) => ({ label: r.region, total: r.count, segments: [{ cls: r.region === 'Not yet linked' ? 'seg-muted' : 'seg-navy', label: r.region, value: r.count }] }))}
            />
          </div>
        </div>

        <div className="content-card">
          <div className="card-header"><span className="card-title">Monthly Complaint Trend</span></div>
          <div className="card-body">
            {data.monthly.length ? <MonthlyTrend months={data.monthly} /> : <EmptyState title="No complaints yet" />}
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="content-card">
          <div className="card-header">
            <span className="card-title">Recently Received Complaints</span>
            <Link className="table-link" to="/cases">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Case ID</th><th>Institution</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {data.recent.map((c) => (
                  <tr key={c.case_id}>
                    <td><Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{displayCaseId(c.case_id)}</Link></td>
                    <td>{c.institution?.name || c.raw_institution_name || '—'}<div className="row-muted">{c.bureau} · {c.subject}</div></td>
                    <td><Badge status={c.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.receipt_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card">
          <div className="card-header">
            <span className="card-title">Overdue Complaints Requiring Attention</span>
            <Link className="table-link" to="/alerts">View all <ArrowRight size={12} /></Link>
          </div>
          {overdueList.loading && <LoadingState />}
          {overdueList.error && <ErrorState message={overdueList.error} onRetry={overdueList.reload} />}
          {overdueList.data && overdueList.data.length === 0 && <EmptyState title="No overdue complaints" />}
          {overdueList.data && overdueList.data.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Case ID</th><th>Institution</th><th>Officer</th><th>Days overdue</th></tr></thead>
                <tbody>
                  {overdueList.data.map((c) => (
                    <tr key={c.case_id}>
                      <td><Link className="table-link cell-code" to={`/cases/${c.case_id}`}>{displayCaseId(c.case_id)}</Link><div className="row-muted">{c.bureau}</div></td>
                      <td>{c.institution?.name || '—'}<div className="row-muted">{humanize(c.category)}</div></td>
                      <td>{officerName(c.assigned_officer_display)}</td>
                      <td><Badge status="overdue">{c.days_overdue} days</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Demonstration walkthrough: kept separate so it does not dominate the dashboard. */}
      <details className="content-card demo-walkthrough" style={{ marginTop: '1.5rem' }}>
        <summary>Demonstration walkthrough: one institution, complaints in three Bureaus</summary>
        <div className="card-body">
          <p className="detail-text" style={{ marginBottom: '0.75rem' }}>
            ABC Engineering College (a fictional demonstration institution) has active complaints with PGRC, the Regulation Bureau and
            the Approval Bureau. A student's fee-refund complaint (PGRC/2026/0001) and the Regulation Bureau's check on the college's
            refund practice (RB/2026/0002) concern the same matter in different words. The laboratory complaint (AB/2026/0003) is a
            separate issue. Use the links to follow the walkthrough with the live records.
          </p>
          <div className="link-list">
            <Link className="btn btn-outline" to="/institutions/SYN-INST-0001">1. Institution profile</Link>
            <Link className="btn btn-outline" to="/cases/SYN-PGRC-2026-0001">2. PGRC complaint</Link>
            <Link className="btn btn-outline" to="/cases/SYN-RB-2026-0002">3. Regulation Bureau case</Link>
            <Link className="btn btn-outline" to="/overlap/SYN-PGRC-2026-0001:SYN-RB-2026-0002">4. Possible duplicate review</Link>
            <Link className="btn btn-outline" to="/cases/SYN-AB-2026-0003">5. Unrelated Approval Bureau case</Link>
          </div>
        </div>
      </details>
    </div>
  );
}
