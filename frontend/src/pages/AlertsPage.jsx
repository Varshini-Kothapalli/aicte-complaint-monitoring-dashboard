import React from 'react';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

const SAMPLE_ALERTS = [
  {
    case_id: 'SYN-PGRC-2026-0001',
    institution: 'ABC Engineering College (Pune)',
    bureau: 'PGRC',
    officer: 'SYN-USR-PGRC-01',
    due_date: '2026-10-20',
    days_overdue: 11,
    escalation_level: 'Bureau Head',
    last_remark: 'Overdue 11 days: escalated to Bureau head',
  },
  {
    case_id: 'SYN-AB-2026-0003',
    institution: 'ABC Engineering College (Pune)',
    bureau: 'AB',
    officer: 'SYN-USR-AB-02',
    due_date: '2026-10-25',
    days_overdue: 6,
    escalation_level: 'Pending Initial Notice',
    last_remark: 'Due date passed; pending response from institution',
  },
  {
    case_id: 'SYN-PGRC-2026-0018',
    institution: 'PQR Institute of Technology (Pune)',
    bureau: 'PGRC',
    officer: 'SYN-USR-PGRC-03',
    due_date: '2026-09-24',
    days_overdue: 37,
    escalation_level: 'Regional Official & Senior Management',
    last_remark: 'Overdue 37 days: escalated to regional official and management queue',
  },
];

export default function AlertsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>SLA Alerts & Automated Escalation Queue</h2>
          <p>Two-tier statutory deadline monitoring and hierarchical automated notifications</p>
        </div>
        <ProvenanceTag type="SYNTHETIC" />
      </div>

      {/* Escalation Policy Explainer */}
      <div className="content-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem', color: '#DC2626' }}>
            Two-Stage Automated Escalation Hierarchy
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Hourly Agenda.js background monitoring checks all active cases against their <code>expected_disposal_date</code>:
            <br />
            &bull; <strong>Stage 1 (&gt; 7 Days Overdue):</strong> Automatically escalated to the respective Bureau Head.
            <br />
            &bull; <strong>Stage 2 (&gt; 21 Days Overdue):</strong> Escalated to Regional Officials and the Senior Management oversight queue.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <span className="card-title">Active Overdue Case Alerts (162 Active Overdue Cases in Fixture)</span>
          <span className="status-badge overdue">162 OVERDUE</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Institution</th>
                <th>Bureau</th>
                <th>Assigned Officer</th>
                <th>SLA Target Date</th>
                <th>Delay</th>
                <th>Current Escalation Level</th>
                <th>Last System Audit Remark</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ALERTS.map(a => (
                <tr key={a.case_id}>
                  <td className="cell-code">{a.case_id}</td>
                  <td><strong>{a.institution}</strong></td>
                  <td><Badge status={a.bureau}>{a.bureau}</Badge></td>
                  <td className="cell-code" style={{ fontSize: '0.75rem' }}>{a.officer}</td>
                  <td>{a.due_date}</td>
                  <td>
                    <span className="status-badge overdue">
                      +{a.days_overdue} days
                    </span>
                  </td>
                  <td>
                    <strong>{a.escalation_level}</strong>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {a.last_remark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
