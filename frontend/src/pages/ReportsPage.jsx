import React from 'react';
import { 
  BarChart3, 
  FileDown, 
  Clock, 
  Building, 
  ArrowLeftRight, 
  GitMerge, 
  PieChart 
} from 'lucide-react';

const REPORT_FAMILIES = [
  {
    id: 'rep-bureau',
    title: 'Bureau Workload & Throughput',
    description: 'Case ingestion volumes, resolution rates, and active queue counts across PGRC, Regulation Bureau, and Approval Bureau.',
    icon: BarChart3,
  },
  {
    id: 'rep-sla',
    title: 'SLA Compliance & Resolution Turnaround',
    description: 'Average resolution duration (days) versus statutory SLA deadlines; ageing analysis for open cases.',
    icon: Clock,
  },
  {
    id: 'rep-repeat',
    title: 'Chronic Repeat-Offender Institutions',
    description: 'Ranking of institutions with highest multi-Bureau complaints, recurring fee non-refunds, and faculty disputes.',
    icon: Building,
  },
  {
    id: 'rep-transfer',
    title: 'Inter-Bureau Case Transfers',
    description: 'Audit log of cases reassigned between Bureaus, transfer justifications, and acceptance latencies.',
    icon: ArrowLeftRight,
  },
  {
    id: 'rep-overlap',
    title: 'Cross-Bureau Overlap Detection Efficacy',
    description: 'Precision and recall evaluation against the 214 ground truth pairs; coordinator decision audit.',
    icon: GitMerge,
  },
  {
    id: 'rep-category',
    title: 'Category & Grievance Nature Diagnostics',
    description: 'Breakdown of complaints across fee refund, salary arrears, certificates withheld, and excess intake.',
    icon: PieChart,
  },
];

export default function ReportsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Reports & Analytics Hub</h2>
          <p>6 standard administrative report families specified in AICTE architecture</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {REPORT_FAMILIES.map(rep => {
          const Icon = rep.icon;
          return (
            <div key={rep.id} className="content-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="metric-icon-wrap" style={{ backgroundColor: '#F1F5F9' }}>
                    <Icon size={18} color="var(--primary-navy)" />
                  </div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{rep.title}</h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {rep.description}
                </p>
              </div>

              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#FAFBFD' }}>
                <button className="btn btn-outline" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}>
                  <FileDown size={12} /> CSV
                </button>
                <button className="btn btn-primary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}>
                  Generate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
