import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Building2, 
  GitCompare, 
  AlertTriangle, 
  BarChart3, 
  FileText,
  HelpCircle 
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
          <span className="nav-badge" style={{ backgroundColor: '#D97706' }}>87</span>
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

      {/* Footer Notice */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.6875rem', color: '#64748B', lineHeight: '1.4' }}>
          <div>AICTE Prototype Environment</div>
          <div style={{ color: '#FCD34D', fontWeight: 600, marginTop: '2px' }}>
            SYNTHETIC DEMO DATA
          </div>
        </div>
      </div>
    </aside>
  );
}
