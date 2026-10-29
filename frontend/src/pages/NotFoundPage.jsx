import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <AlertCircle className="empty-state-icon" style={{ color: '#EF4444' }} />
      <h3>404 - Page Not Found</h3>
      <p>The administrative portal resource you requested does not exist or has been moved.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        <ArrowLeft size={14} /> Return to Dashboard
      </Link>
    </div>
  );
}
