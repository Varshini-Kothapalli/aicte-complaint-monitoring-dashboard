import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchHealth } from '../services/api';

export default function Header({ currentBureau = 'ALL', onBureauChange }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
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
          <span>Viewing:</span>
          <strong>{currentBureau === 'ALL' ? 'All Bureaus' : currentBureau}</strong>
        </div>

        <form
          className="header-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = search.trim();
            if (q) navigate(`/cases?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search size={16} />
          <input
            type="search"
            placeholder="Search complaints by number, institution or keyword…"
            aria-label="Search complaints"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="header-right">
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
              ? (healthStatus.dbConnected ? 'System Online' : 'Database unavailable')
              : 'API Offline'}
          </span>
        </div>

        <div className="user-profile-widget">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <div className="user-name">Demo user</div>
            <div className="user-role">Login not yet enabled</div>
          </div>
        </div>
      </div>
    </header>
  );
}
