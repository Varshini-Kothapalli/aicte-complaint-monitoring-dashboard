import React from 'react';
import { NavLink } from 'react-router-dom';
import useApiResource from '../hooks/useApiResource';
import { fetchDashboardSummary } from '../services/api';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Building2, 
  GitCompare, 
  AlertTriangle, 
  BarChart3,
  Info
} from 'lucide-react';

export default function Sidebar() {
  // Live counts for the navigation badges (no fixed numbers).
  const { data } = useApiResource((opts) => fetchDashboardSummary(opts), []);
  const overdue = data?.totals?.overdue;
  const duplicates = data?.totals?.possible_duplicates;
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="aicte-logo-box">AICTE</div>
        <div className="sidebar-title-group">
          <h1>Institution Portal</h1>
          <p>Complaint Monitoring</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Monitoring</div>
        
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/cases" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FolderKanban />
          <span>All Complaints</span>
        </NavLink>

        <NavLink 
          to="/institutions" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Building2 />
          <span>Institutions</span>
        </NavLink>

        <div className="nav-section-label">Review &amp; Action</div>

        <NavLink 
          to="/overlap" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <GitCompare />
          <span>Possible Duplicates</span>
          {duplicates > 0 && <span className="nav-badge" style={{ backgroundColor: 'var(--color-accent)', color: '#1F2937' }} aria-label={`${duplicates} awaiting review`}>{duplicates}</span>}
        </NavLink>

        <NavLink 
          to="/alerts" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle />
          <span>Pending Actions</span>
          {overdue > 0 && <span className="nav-badge" aria-label={`${overdue} overdue`}>{overdue}</span>}
        </NavLink>

        <div className="nav-section-label">Reports</div>

        <NavLink 
          to="/reports" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BarChart3 />
          <span>Reports</span>
        </NavLink>
      </nav>

      {/* Data Sources Disclosure */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.6875rem', color: '#CBD5E1', lineHeight: '1.4' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--color-accent)' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: '2px' }}>Data Sources</div>
            <div>The demonstration dataset includes synthetic records and imported records whose authenticity or relevance has not been fully verified.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
