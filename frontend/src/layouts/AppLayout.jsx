import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function AppLayout() {
  const [currentBureau, setCurrentBureau] = useState('ALL');

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="app-main">
        {/* Global Demo Watermark Banner */}
        <div className="demo-banner">
          <div>
            AICTE SMART INDIA HACKATHON 2026 PROTOTYPE &bull; <span className="highlight">EVALUATION ENVIRONMENT</span>
          </div>
          <div>
            Data Provenance: <span className="highlight">SYNTHETIC + IMPORTED UNVERIFIED</span>
          </div>
        </div>

        {/* Global Header */}
        <Header 
          currentBureau={currentBureau} 
          onBureauChange={setCurrentBureau} 
        />

        {/* Dynamic Route Content */}
        <main className="page-container">
          <Outlet context={{ currentBureau }} />
        </main>
      </div>
    </div>
  );
}
