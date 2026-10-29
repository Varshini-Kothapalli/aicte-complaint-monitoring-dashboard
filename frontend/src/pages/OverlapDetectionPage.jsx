import React from 'react';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import { GitCompare, Check, X, Link as LinkIcon, AlertCircle } from 'lucide-react';

const SAMPLE_PAIRS = [
  {
    pair_id: 'SYN-PAIR-001',
    case_a: 'SYN-PGRC-2026-0001',
    case_b: 'SYN-RB-2026-0002',
    institution: 'ABC Engineering College (SYN-INST-0001)',
    bureau_a: 'PGRC',
    bureau_b: 'RB',
    category_a: 'fee_refund',
    category_b: 'fee_regulation_compliance',
    relation: 'same_matter',
    shares_ref: false,
    band: 'HIGH',
    score: 0.82,
    alert: true,
    reason: 'Same fee-refund matter seen by PGRC and RB with divergent wording',
  },
  {
    pair_id: 'SYN-PAIR-004',
    case_a: 'SYN-AB-2026-0004',
    case_b: 'SYN-RB-2026-0005',
    institution: 'BCD Institute of Management (SYN-INST-0002)',
    bureau_a: 'AB',
    bureau_b: 'RB',
    category_a: 'approval_deficiency',
    category_b: 'fake_faculty',
    relation: 'same_matter',
    shares_ref: true,
    band: 'HIGH',
    score: 0.94,
    alert: true,
    reason: 'Shared reference letter SYN/LTR/2026/168 + related faculty categories',
  },
  {
    pair_id: 'SYN-PAIR-002',
    case_a: 'SYN-PGRC-2026-0001',
    case_b: 'SYN-AB-2026-0003',
    institution: 'ABC Engineering College (SYN-INST-0001)',
    bureau_a: 'PGRC',
    bureau_b: 'AB',
    category_a: 'fee_refund',
    category_b: 'approval_deficiency',
    relation: 'different_matter',
    shares_ref: false,
    band: 'NONE',
    score: 0.14,
    alert: false,
    reason: 'Same institution but unrelated issues (fee refund vs lab facilities)',
  },
];

export default function OverlapDetectionPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Cross-Bureau Overlap Detection & Coordination</h2>
          <p>Engine D2: Advisory overlap alerts, explainable match scoring, and official review actions</p>
        </div>
        <ProvenanceTag type="SYNTHETIC" />
      </div>

      {/* Advisory Notice */}
      <div className="content-card" style={{ borderLeft: '4px solid #D97706' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem', color: '#B45309' }}>
            System Guardrail: AI is Strictly Advisory
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Engine D2 calculates hybrid similarity scores combining <strong>dense semantic embeddings (all-MiniLM-L6-v2)</strong>, 
            <strong>category-pair rules</strong>, and <strong>shared reference numbers</strong>. Overlap detections 
            <strong> never automatically merge, transfer, or halt any regulatory action</strong>. Every coordination decision is audited with official ID and timestamp.
          </p>
        </div>
      </div>

      {/* Candidate Overlaps Table */}
      <div className="content-card">
        <div className="card-header">
          <span className="card-title">Potential Overlapping Cases (214 Ground Truth Benchmark Pairs)</span>
          <span className="status-badge medium-band">87 Cross-Bureau Alerts Configured</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pair ID</th>
                <th>Institution</th>
                <th>Case A</th>
                <th>Case B</th>
                <th>Match Band</th>
                <th>Match Rationale</th>
                <th>Official Actions</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_PAIRS.map(p => (
                <tr key={p.pair_id} style={p.alert ? { backgroundColor: '#FFFDF5' } : {}}>
                  <td className="cell-code">{p.pair_id}</td>
                  <td><strong>{p.institution}</strong></td>
                  <td>
                    <div className="cell-code">{p.case_a}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      <Badge status={p.bureau_a}>{p.bureau_a}</Badge> {p.category_a}
                    </div>
                  </td>
                  <td>
                    <div className="cell-code">{p.case_b}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      <Badge status={p.bureau_b}>{p.bureau_b}</Badge> {p.category_b}
                    </div>
                  </td>
                  <td>
                    {p.band === 'HIGH' && <span className="status-badge high-band">HIGH ({p.score})</span>}
                    {p.band === 'MEDIUM' && <span className="status-badge medium-band">MEDIUM ({p.score})</span>}
                    {p.band === 'NONE' && <span className="status-badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>NONE ({p.score})</span>}
                    {p.alert && (
                      <div style={{ fontSize: '0.6875rem', color: '#B45309', fontWeight: 700, marginTop: '2px' }}>
                        Alert Active
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', maxWidth: '280px' }}>
                    {p.reason}
                    {p.shares_ref && (
                      <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                        &bull; Shares Reference ID
                      </div>
                    )}
                  </td>
                  <td>
                    {p.alert ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Confirm & Link">
                          <Check size={12} /> Link
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Dismiss Alert">
                          <X size={12} /> Dismiss
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No action required</span>
                    )}
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
