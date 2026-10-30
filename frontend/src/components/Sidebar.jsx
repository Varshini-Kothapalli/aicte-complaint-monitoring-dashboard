import React from 'react';
import { NavLink } from 'react-router-dom';
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
        <div className="nav-section-label">Monitoring & Oversight</div>
        
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard />
          <span>Central Dashboard</span>
        </NavLink>

        <NavLink 
          to="/cases" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FolderKanban />
          <span>All Cases Explorer</span>
        </NavLink>

        <NavLink 
          to="/institutions" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Building2 />
          <span>Institution Profiles</span>
        </NavLink>

        <div className="nav-section-label">Intelligence Engines</div>

        <NavLink 
          to="/overlap" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <GitCompare />
          <span>Overlap Detection</span>
          <span className="nav-badge" style={{ backgroundColor: 'var(--color-accent)', color: '#1F2937' }}>87</span>
        </NavLink>

        <NavLink 
          to="/alerts" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle />
          <span>Alerts & Escalations</span>
          <span className="nav-badge">162</span>
        </NavLink>

        <div className="nav-section-label">Governance & Audit</div>

        <NavLink 
          to="/reports" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BarChart3 />
          <span>Reports & Analytics</span>
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
