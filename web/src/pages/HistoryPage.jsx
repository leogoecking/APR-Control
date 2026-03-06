import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { StatCard } from '../components/StatCard.jsx';

export function HistoryPage({ refMonth }) {
  const [source, setSource] = useState('manual');
  const [history, setHistory] = useState(null);

  useEffect(() => {
    api.history(refMonth, source).then(setHistory).catch(() => setHistory(null));
  }, [refMonth, source]);

  return (
    <section className="page-grid">
      <section className="panel compact-panel">
        <div className="toolbar-row">
          <div>
            <p className="eyebrow">Comparativo histórico</p>
            <h3>{refMonth}</h3>
          </div>
          <select value={source} onChange={event => setSource(event.target.value)}>
            <option value="manual">Base manual</option>
            <option value="system">Base sistema</option>
          </select>
        </div>
      </section>
      <section className="stats-grid">
        <StatCard label="Novo" value={history?.summary.novo ?? 0} tone="success" />
        <StatCard label="Alterado" value={history?.summary.alterado ?? 0} tone="danger" />
        <StatCard label="Sem alteração" value={history?.summary.semAlteracao ?? 0} tone="info" />
      </section>
      <section className="panel">
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>APR ID</th>
                <th>Status</th>
                <th>Campos alterados</th>
                <th>Anterior</th>
                <th>Atual</th>
              </tr>
            </thead>
            <tbody>
              {(history?.details || []).map(item => (
                <tr key={item.aprId}>
                  <td>{item.aprId}</td>
                  <td><span className={`status-pill ${item.status === 'Alterado' ? 'danger' : 'ok'}`}>{item.status}</span></td>
                  <td>{item.changed.join(', ') || '-'}</td>
                  <td>{item.previous?.assunto || '-'}</td>
                  <td>{item.current?.assunto || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history?.details?.length ? <div className="empty-state">Sem registros para comparação histórica.</div> : null}
        </div>
      </section>
    </section>
  );
}
