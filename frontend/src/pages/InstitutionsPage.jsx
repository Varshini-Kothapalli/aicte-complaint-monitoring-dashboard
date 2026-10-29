import React from 'react';
import ProvenanceTag from '../components/ProvenanceTag';
import Badge from '../components/Badge';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';

const SAMPLE_INSTITUTIONS = [
  {
    institution_id: 'SYN-INST-0001',
    aicte_permanent_id: 'SYN-1-100037',
    name: 'ABC Engineering College',
    stream: 'Engineering',
    state: 'Maharashtra',
    district: 'Pune',
    region: 'West',
    ownership: 'Private-Self Financing',
    established: 1999,
    status: 'VERIFIED',
  },
  {
    institution_id: 'SYN-INST-0016',
    aicte_permanent_id: 'SYN-1-100592',
    name: 'PQR Institute of Technology',
    stream: 'Engineering',
    state: 'Maharashtra',
    district: 'Pune',
    region: 'West',
    ownership: 'Private-Self Financing',
    established: 2004,
    status: 'VERIFIED',
    disambiguationNote: 'Shares name with Belagavi institution',
  },
  {
    institution_id: 'SYN-INST-0061',
    aicte_permanent_id: 'SYN-1-102294',
    name: 'PQR Institute of Technology',
    stream: 'Engineering',
    state: 'Karnataka',
    district: 'Belagavi',
    region: 'South-West',
    ownership: 'Private-Self Financing',
    established: 2009,
    status: 'VERIFIED',
    disambiguationNote: 'Shares name with Pune institution',
  },
  {
    institution_id: 'SYN-INST-0002',
    aicte_permanent_id: 'SYN-1-100074',
    name: 'BCD Institute of Management',
    stream: 'Management',
    state: 'Punjab',
    district: 'Ludhiana',
    region: 'North-West',
    ownership: 'Government Aided',
    established: 2016,
    status: 'VERIFIED',
  },
  {
    institution_id: 'SYN-INST-0003',
    aicte_permanent_id: 'SYN-1-100111',
    name: 'CDE College of Pharmacy',
    stream: 'Pharmacy',
    state: 'Karnataka',
    district: 'Mysuru',
    region: 'South-West',
    ownership: 'Government',
    established: 2000,
    status: 'VERIFIED',
  },
];

export default function InstitutionsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Institution Profiles & Identity Resolution</h2>
          <p>Master registry of AICTE-approved institutions and Engine D1 identity matching</p>
        </div>
        <ProvenanceTag type="SYNTHETIC" />
      </div>

      {/* Engine D1 Explainer Card */}
      <div className="content-card" style={{ borderLeft: '4px solid var(--primary-navy)' }}>
        <div className="card-body">
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Engine D1: Institution Identity Resolution
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Incoming complaints often contain abbreviated or informal institution names (e.g., <em>"ABC Engg Coll Pune"</em>). 
            Engine D1 applies exact permanent ID matching, token normalization, and fuzzy string similarity. 
            Only records with <strong>confidence &ge; 0.92</strong> are marked <strong>VERIFIED</strong>. Ambiguous cases (such as duplicate names across different states) are held in the <strong>Verification Queue</strong> before complaints enter overlap detection.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <span className="card-title">Institutions Directory (61 Total Synthetic Fixtures)</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="provenance-tag provenance-verified">60 VERIFIED</span>
            <span className="provenance-tag provenance-unverified">1 TEST QUEUE</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Institution ID</th>
                <th>AICTE Permanent ID</th>
                <th>Institution Name</th>
                <th>Stream</th>
                <th>District / State</th>
                <th>Region</th>
                <th>Ownership</th>
                <th>Est.</th>
                <th>Identity Status</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_INSTITUTIONS.map(inst => (
                <tr key={inst.institution_id}>
                  <td className="cell-code">{inst.institution_id}</td>
                  <td className="cell-code">{inst.aicte_permanent_id}</td>
                  <td>
                    <strong>{inst.name}</strong>
                    {inst.disambiguationNote && (
                      <div style={{ fontSize: '0.6875rem', color: '#D97706', marginTop: '2px' }}>
                        &bull; {inst.disambiguationNote}
                      </div>
                    )}
                  </td>
                  <td>{inst.stream}</td>
                  <td>{inst.district}, {inst.state}</td>
                  <td>{inst.region}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{inst.ownership}</td>
                  <td>{inst.established}</td>
                  <td>
                    <span className="provenance-tag provenance-verified">
                      <CheckCircle2 size={10} style={{ marginRight: '2px' }} />
                      {inst.status}
                    </span>
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
