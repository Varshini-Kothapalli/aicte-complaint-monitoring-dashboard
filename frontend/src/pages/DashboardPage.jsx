import React from 'react';
import MetricCard from '../components/MetricCard';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import { 
  FolderKanban, 
  Clock, 
  AlertOctagon, 
  GitCompare, 
  ArrowUpRight,
  Building,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Executive Monitoring Dashboard</h2>
          <p>Integrated institutional oversight across PGRC, Regulation Bureau, and Approval Bureau</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ProvenanceTag type="SYNTHETIC" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Demo As-Of: <strong>31 October 2026</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <MetricCard 
          label="Total Active Cases" 
          value="344" 
          subtext="Across 3 Bureaus"
          icon={FolderKanban}
          provenance="SYNTHETIC"
        />
        <MetricCard 
          label="Overdue SLA Cases" 
          value="162" 
          subtext="Exceeded target disposal"
          icon={Clock}
          provenance="DERIVED"
          isAlert={true}
        />
        <MetricCard 
          label="Potential Overlaps" 
          value="87" 
          subtext="Cross-Bureau alerts pending"
          icon={GitCompare}
          provenance="DERIVED"
        />
        <MetricCard 
          label="Monitored Institutions" 
          value="61" 
          subtext="In 9 AICTE regions"
          icon={Building}
          provenance="SYNTHETIC"
        />
      </div>

      {/* Scripted Demo Showcase */}
      <div className="content-card">
        <div className="card-header" style={{ backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="#D97706" />
            <span className="card-title">Scripted Walkthrough Matter: ABC Engineering College (Pune)</span>
          </div>
          <ProvenanceTag type="SYNTHETIC" />
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Two active cases from distinct Bureaus discuss the identical student fee refund dispute at 
            <strong> ABC Engineering College (SYN-INST-0001)</strong>. Engine D2 identifies this cross-Bureau coordination overlap.
          </p>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Bureau</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Assigned Officer</th>
                  <th>Expected Disposal</th>
                  <th>Engine D2 Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cell-code">SYN-PGRC-2026-0001</td>
                  <td><Badge status="PGRC">PGRC</Badge></td>
                  <td>Fee Refund</td>
                  <td><Badge status="under-process">Under Process</Badge></td>
                  <td>SYN-USR-PGRC-01</td>
                  <td>2026-10-20 (Overdue)</td>
                  <td rowSpan={2} style={{ verticalAlign: 'middle', backgroundColor: '#FEF3C7', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#B45309', fontSize: '0.75rem' }}>
                      COORDINATION REQUIRED
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#78350F' }}>
                      Score: 0.82 (High Band)
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="cell-code">SYN-RB-2026-0002</td>
                  <td><Badge status="RB">RB</Badge></td>
                  <td>Fee Regulation Compliance</td>
                  <td><Badge status="action-initiated">Action Initiated</Badge></td>
                  <td>SYN-USR-RB-02</td>
                  <td>2026-12-06</td>
                </tr>
                <tr style={{ opacity: 0.75 }}>
                  <td className="cell-code">SYN-AB-2026-0003</td>
                  <td><Badge status="AB">AB</Badge></td>
                  <td>Laboratory Deficiency</td>
                  <td><Badge status="under-process">Under Process</Badge></td>
                  <td>SYN-USR-AB-02</td>
                  <td>2026-10-25</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Different Matter (No Alert)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid of Summary Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Status Distribution */}
        <div className="content-card">
          <div className="card-header">
            <span className="card-title">Case Lifecycle Distribution</span>
            <ProvenanceTag type="SYNTHETIC" />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Disposed</span>
                <strong>465 (57.5%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Under Process</span>
                <strong>132 (16.3%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Action Initiated</span>
                <strong>89 (11.0%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Assigned</span>
                <strong>85 (10.5%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Received (Unassigned)</span>
                <strong>38 (4.7%)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bureau Distribution */}
        <div className="content-card">
          <div className="card-header">
            <span className="card-title">Workload by Bureau</span>
            <ProvenanceTag type="SYNTHETIC" />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Public Grievance Redressal Cell (PGRC)</span>
                <strong>394 cases</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Regulation Bureau (RB)</span>
                <strong>285 cases</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Approval Bureau (AB)</span>
                <strong>130 cases</strong>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Total Prototype Cases</span>
                <strong>809 cases</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
