import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/manual', label: 'Lançamentos' },
  { to: '/auditoria', label: 'Auditoria' },
  { to: '/historico', label: 'Histórico' },
  { to: '/importacoes', label: 'Importações' },
  { to: '/manutencao', label: 'Manutenção' },
];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function AppLayout({ months, refMonth, setRefMonth, onRefresh, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">APR Control</p>
          <h1>Operação Local</h1>
          <p className="sidebar-copy">Servidor local Debian com auditoria centralizada, importações síncronas e histórico por mês.</p>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-panel">
          <label htmlFor="global-month">Mês global</label>
          <input id="global-month" type="month" value={refMonth} onChange={event => setRefMonth(event.target.value || currentMonthValue())} />
          <button type="button" className="ghost-button" onClick={onRefresh}>Atualizar dados</button>
          <div className="month-chip-list">
            {months.slice(0, 8).map(month => (
              <button
                key={month.refMonth}
                type="button"
                className={`month-chip ${month.refMonth === refMonth ? 'active' : ''}`}
                onClick={() => setRefMonth(month.refMonth)}
              >
                {month.refMonth}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <main className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Mês selecionado</p>
            <h2>{refMonth || currentMonthValue()}</h2>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={() => setRefMonth(currentMonthValue())}>Mês atual</button>
            <button type="button" className="primary-button" onClick={onRefresh}>Recarregar</button>
          </div>
        </header>
        {children ?? <Outlet context={{ refMonth, setRefMonth, months, onRefresh }} />}
      </main>
    </div>
  );
}
