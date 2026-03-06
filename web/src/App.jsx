import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import { AppLayout } from './components/AppLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ManualPage } from './pages/ManualPage.jsx';
import { AuditPage } from './pages/AuditPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { ImportsPage } from './pages/ImportsPage.jsx';
import { MaintenancePage } from './pages/MaintenancePage.jsx';

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function App() {
  const [months, setMonths] = useState([]);
  const [refMonth, setRefMonth] = useState(() => localStorage.getItem('apr-control-ref-month') || defaultMonth());
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    localStorage.setItem('apr-control-ref-month', refMonth);
  }, [refMonth]);

  useEffect(() => {
    let active = true;
    api.months().then(data => {
      if (!active) return;
      setMonths(data);
      if (!data.some(item => item.refMonth === refMonth) && data[0]?.refMonth) {
        setRefMonth(data[0].refMonth);
      }
    }).catch(() => {
      if (!active) return;
      setMonths([]);
    });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const layoutProps = useMemo(() => ({
    months,
    refMonth,
    setRefMonth,
    onRefresh: () => setRefreshToken(token => token + 1),
  }), [months, refMonth]);

  return (
    <AppLayout {...layoutProps}>
      <Routes>
        <Route path="/" element={<DashboardPage refMonth={refMonth} />} />
        <Route path="/manual" element={<ManualPage refMonth={refMonth} onRefresh={layoutProps.onRefresh} />} />
        <Route path="/auditoria" element={<AuditPage refMonth={refMonth} />} />
        <Route path="/historico" element={<HistoryPage refMonth={refMonth} />} />
        <Route path="/importacoes" element={<ImportsPage refMonth={refMonth} onRefresh={layoutProps.onRefresh} />} />
        <Route path="/manutencao" element={<MaintenancePage refMonth={refMonth} onRefresh={layoutProps.onRefresh} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
