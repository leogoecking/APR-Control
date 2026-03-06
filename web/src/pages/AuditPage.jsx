import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { StatCard } from '../components/StatCard.jsx';

export function AuditPage({ refMonth }) {
  const [audit, setAudit] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    api.audit(refMonth).then(setAudit).catch(() => setAudit(null));
  }, [refMonth]);

  const details = useMemo(() => {
    if (!audit) return [];
    return audit.details.filter(item => {
      if (status === 'missing' && item.status === 'Conferido') return false;
      if (!search) return true;
      const haystack = [item.aprId, item.system?.assunto, item.manual?.assunto, item.system?.colaborador, item.manual?.colaborador].join(' ').toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [audit, search, status]);

  return (
    <section className="page-grid">
      <section className="stats-grid">
        <StatCard label="Conferidos" value={audit?.summary.conferido ?? 0} tone="success" />
        <StatCard label="Só no sistema" value={audit?.summary.soSistema ?? 0} tone="warning" />
        <StatCard label="Só no manual" value={audit?.summary.soManual ?? 0} tone="info" />
        <StatCard label="Divergências" value={(audit?.summary.soSistema ?? 0) + (audit?.summary.soManual ?? 0)} tone="danger" helper="Somente IDs ausentes são considerados divergência." />
      </section>
      <section className="panel">
        <div className="toolbar-row">
          <input placeholder="Buscar por ID, assunto ou colaborador" value={search} onChange={event => setSearch(event.target.value)} />
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">Todos</option>
            <option value="missing">Somente divergentes</option>
          </select>
          <a className="ghost-button link-button" href={api.exportDivergencesUrl(refMonth)}>Exportar divergentes</a>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>APR ID</th>
                <th>Status</th>
                <th>Diferenças de dados</th>
                <th>Assunto sistema</th>
                <th>Assunto manual</th>
                <th>Colaborador sistema</th>
                <th>Colaborador manual</th>
              </tr>
            </thead>
            <tbody>
              {details.map(item => (
                <tr key={item.aprId}>
                  <td>{item.aprId}</td>
                  <td><span className={`status-pill ${item.status === 'Conferido' ? 'ok' : 'warn'}`}>{item.status}</span></td>
                  <td>{item.changed.join(', ') || '-'}</td>
                  <td>{item.system?.assunto || '-'}</td>
                  <td>{item.manual?.assunto || '-'}</td>
                  <td>{item.system?.colaborador || '-'}</td>
                  <td>{item.manual?.colaborador || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!details.length ? <div className="empty-state">Nenhum resultado para os filtros atuais.</div> : null}
        </div>
      </section>
    </section>
  );
}
