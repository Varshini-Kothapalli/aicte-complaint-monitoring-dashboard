import React, { useEffect, useState } from 'react';
import { Search, Bell, ShieldCheck, Database, Server } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function Header({ currentBureau = 'ALL', onBureauChange }) {
  const [healthStatus, setHealthStatus] = useState({
    checked: false,
    online: false,
    dbConnected: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkBackend() {
      const res = await fetchHealth();
      if (!isMounted) return;

      if (res.ok && res.data) {
        setHealthStatus({
          checked: true,
          online: true,
          dbConnected: res.data.database?.healthy ?? false,
          details: res.data,
        });
      } else {
        setHealthStatus({
          checked: true,
          online: false,
          dbConnected: false,
        });
      }
    }

    checkBackend();
    const timer = setInterval(checkBackend, 15000); // Poll every 15s
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-bureau-pill">
          <ShieldCheck size={16} />
          <span>Scope:</span>
          <strong>{currentBureau === 'ALL' ? 'Integrated (All Bureaus)' : currentBureau}</strong>
        </div>

        <div className="header-search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search cases, AICTE IDs, or institutions..." 
            aria-label="Search"
          />
        </div>
      </div>

      <div className="header-right">
        {/* Backend & DB Health Indicator */}
        <div 
          className="system-status-indicator"
          title={
            healthStatus.online 
              ? `API Online | MongoDB: ${healthStatus.dbConnected ? 'Connected' : 'Disconnected'}`
              : 'Backend API Unreachable'
          }
        >
          <div className={`status-dot ${healthStatus.online ? (healthStatus.dbConnected ? '' : 'degraded') : 'error'}`} />
          <span>
            {healthStatus.online 
              ? (healthStatus.dbConnected ? 'System Online' : 'DB Degraded')
              : 'API Offline'}
          </span>
        </div>

        {/* User Profile Pill */}
        <div className="user-profile-widget">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <div className="user-name">SysAdmin 01</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
