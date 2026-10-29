import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import CasesExplorerPage from '../pages/CasesExplorerPage';
import InstitutionsPage from '../pages/InstitutionsPage';
import CaseDetailPage from '../pages/CaseDetailPage';
import InstitutionDetailPage from '../pages/InstitutionDetailPage';
import OverlapDetectionPage from '../pages/OverlapDetectionPage';
import AlertsPage from '../pages/AlertsPage';
import ReportsPage from '../pages/ReportsPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="cases" element={<CasesExplorerPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="institutions" element={<InstitutionsPage />} />
        <Route path="institutions/:institutionId" element={<InstitutionDetailPage />} />
        <Route path="overlap" element={<OverlapDetectionPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
