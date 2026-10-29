import React, { useState } from 'react';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';

const SAMPLE_CASES = [
  {
    case_id: 'SYN-PGRC-2026-0001',
    institution: 'ABC Engineering College (Pune)',
    category: 'fee_refund',
    bureau: 'PGRC',
    officer: 'SYN-USR-PGRC-01',
    status: 'Under Process',
    receipt_date: '2026-09-20',
    expected_disposal: '2026-10-20',
    is_overdue: true,
    subject: 'Fee refund not given after withdrawal',
  },
  {
    case_id: 'SYN-RB-2026-0002',
    institution: 'ABC Engineering College (Pune)',
    category: 'fee_regulation_compliance',
    bureau: 'RB',
    officer: 'SYN-USR-RB-02',
    status: 'Action Initiated',
    receipt_date: '2026-10-07',
    expected_disposal: '2026-12-06',
    is_overdue: false,
    subject: 'Refund practice compliance check',
  },
  {
    case_id: 'SYN-AB-2026-0003',
    institution: 'ABC Engineering College (Pune)',
    category: 'approval_deficiency',
    bureau: 'AB',
    officer: 'SYN-USR-AB-02',
    status: 'Under Process',
    receipt_date: '2026-09-25',
    expected_disposal: '2026-10-25',
    is_overdue: true,
    subject: 'Laboratory deficiency',
  },
  {
    case_id: 'SYN-PGRC-2026-0018',
    institution: 'PQR Institute of Technology (Pune)',
    category: 'salary_non_payment',
    bureau: 'PGRC',
    officer: 'SYN-USR-PGRC-03',
    status: 'Action Initiated',
    receipt_date: '2026-08-25',
    expected_disposal: '2026-09-24',
    is_overdue: true,
    subject: 'Pending salary dues for faculty',
  },
  {
    case_id: 'SYN-RB-2026-0022',
    institution: 'CDE College of Pharmacy (Mysuru)',
    category: 'faculty_norms_compliance',
    bureau: 'RB',
    officer: 'SYN-USR-RB-01',
    status: 'Disposed',
    receipt_date: '2026-06-14',
    expected_disposal: '2026-08-13',
    is_overdue: false,
    subject: 'Faculty pay scale verification completed',
  },
];

export default function CasesExplorerPage() {
  const [bureauFilter, setBureauFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCases = SAMPLE_CASES.filter(c => {
    if (bureauFilter !== 'ALL' && c.bureau !== bureauFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchTerm && !c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !c.institution.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.subject.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>All Cases Explorer</h2>
          <p>Search, filter, and inspect institutional complaints across all Bureaus</p>
        </div>
        <ProvenanceTag type="SYNTHETIC" />
      </div>

      <div className="content-card">
        {/* Filters */}
        <div className="filter-bar">
          <select 
            className="filter-select"
            value={bureauFilter}
            onChange={(e) => setBureauFilter(e.target.value)}
          >
            <option value="ALL">All Bureaus (PGRC, RB, AB)</option>
            <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
            <option value="RB">Regulation Bureau (RB)</option>
            <option value="AB">Approval Bureau (AB)</option>
          </select>

          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Assigned">Assigned</option>
            <option value="Under Process">Under Process</option>
            <option value="Action Initiated">Action Initiated</option>
            <option value="Disposed">Disposed</option>
          </select>

          <input 
            type="text" 
            placeholder="Search by case ID or keyword..."
            className="filter-select"
            style={{ width: '280px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="btn btn-outline" style={{ marginLeft: 'auto' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Institution</th>
                <th>Bureau</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Expected Disposal</th>
                <th>Assigned Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.case_id}>
                  <td className="cell-code">{c.case_id}</td>
                  <td><strong>{c.institution}</strong></td>
                  <td><Badge status={c.bureau}>{c.bureau}</Badge></td>
                  <td>{c.subject}</td>
                  <td>
                    <Badge status={c.status} />
                    {c.is_overdue && (
                      <span style={{ marginLeft: '0.25rem' }}>
                        <Badge status="overdue">Overdue</Badge>
                      </span>
                    )}
                  </td>
                  <td>{c.expected_disposal}</td>
                  <td className="cell-code" style={{ fontSize: '0.75rem' }}>{c.officer}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing sample records from synthetic prototype dataset (809 total cases available in `data/processed/extracted/csv/cases.csv`).</span>
          <span>Pagination and live MongoDB queries to be wired by Claude Pro.</span>
        </div>
      </div>
    </div>
  );
}
