import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function MaintenancePage({ refMonth, onRefresh }) {
  const [status, setStatus] = useState('Nenhuma ação executada.');
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaborator, setNewCollaborator] = useState('');

  async function loadCollaborators() {
    const result = await api.collaborators();
    setCollaborators(result.colaboradores || []);
  }

  useEffect(() => {
    loadCollaborators().catch(err => setStatus(err.message));
  }, []);

  async function runAction(action, successMessage) {
    try {
      await action();
      setStatus(successMessage);
      onRefresh();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function handleAddCollaborator(event) {
    event.preventDefault();
    try {
      const result = await api.addCollaborator(newCollaborator);
      setCollaborators(result.colaboradores || []);
      setNewCollaborator('');
      setStatus(`Colaborador ${result.name} cadastrado.`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <section className="page-grid two-columns">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Manutenção</p>
            <h3>Operações críticas</h3>
          </div>
        </div>
        <div className="action-grid">
          <button type="button" className="primary-button" onClick={() => runAction(() => api.restoreLatest(), 'Último snapshot restaurado.')}>Restaurar último snapshot</button>
          <button type="button" className="ghost-button" onClick={() => runAction(() => api.clearMonth(refMonth), `Mês ${refMonth} limpo.`)}>Limpar mês atual</button>
          <button type="button" className="danger-button" onClick={() => runAction(() => api.clearAll(), 'Base inteira limpa.')}>Apagar base inteira</button>
        </div>
      </section>
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Colaboradores</p>
            <h3>Catálogo fixo</h3>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleAddCollaborator}>
          <label>
            Novo colaborador
            <input value={newCollaborator} onChange={event => setNewCollaborator(event.target.value)} placeholder="Nome completo" />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={!newCollaborator.trim()}>Adicionar colaborador</button>
          </div>
        </form>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map(name => (
                <tr key={name}>
                  <td>{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!collaborators.length ? <div className="empty-state">Nenhum colaborador cadastrado.</div> : null}
        </div>
      </section>
      <section className="panel compact-panel">
        <p className="status-text">{status}</p>
      </section>
    </section>
  );
}
