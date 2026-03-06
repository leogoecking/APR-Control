import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const EMPTY_FORM = { aprId: '', dataAbertura: '', assunto: '', colaborador: '' };
const EMPTY_CATALOG = { assuntos: [], colaboradores: [] };

function uniqueSorted(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function ManualPage({ refMonth, onRefresh }) {
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    const [manualRows, importCatalog] = await Promise.all([api.manual(refMonth), api.catalog(refMonth)]);
    setRows(manualRows);
    setCatalog(importCatalog || EMPTY_CATALOG);
  }

  useEffect(() => {
    setForm(EMPTY_FORM);
    setEditingId('');
    setStatus('');
    load().catch(err => setStatus(err.message));
  }, [refMonth]);

  const assuntoOptions = useMemo(
    () => uniqueSorted([...(catalog.assuntos || []), form.assunto]),
    [catalog.assuntos, form.assunto],
  );
  const colaboradorOptions = useMemo(
    () => uniqueSorted([...(catalog.colaboradores || []), form.colaborador]),
    [catalog.colaboradores, form.colaborador],
  );
  const catalogReady = catalog.assuntos.length > 0;
  const submitDisabled = !catalogReady || !form.aprId || !form.dataAbertura || !form.assunto || !form.colaborador;
  const catalogMessage = catalogReady ? '' : 'Importe registros do mês para usar a lista fixa de assuntos.';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!catalogReady) {
      setStatus(catalogMessage);
      return;
    }
    try {
      if (editingId) {
        await api.updateManual(refMonth, editingId, form);
        setStatus(`APR ${editingId} atualizada.`);
      } else {
        await api.createManual(refMonth, form);
        setStatus(`APR ${form.aprId} criada.`);
      }
      setForm(EMPTY_FORM);
      setEditingId('');
      await load();
      onRefresh();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function handleDelete(aprId) {
    if (!window.confirm(`Excluir APR ${aprId}?`)) return;
    try {
      await api.deleteManual(refMonth, aprId);
      setStatus(`APR ${aprId} excluída.`);
      await load();
      onRefresh();
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <section className="page-grid two-columns">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Cadastro manual</p>
            <h3>{editingId ? `Editando ${editingId}` : 'Novo lançamento'}</h3>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            APR ID
            <input value={form.aprId} onChange={event => setForm(current => ({ ...current, aprId: event.target.value }))} />
          </label>
          <label>
            Data de abertura
            <input type="date" value={form.dataAbertura} onChange={event => setForm(current => ({ ...current, dataAbertura: event.target.value }))} />
          </label>
          <label>
            Assunto
            <select value={form.assunto} onChange={event => setForm(current => ({ ...current, assunto: event.target.value }))}>
              <option value="">{assuntoOptions.length ? 'Selecione um assunto' : 'Sem assuntos importados'}</option>
              {assuntoOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Colaborador
            <select value={form.colaborador} onChange={event => setForm(current => ({ ...current, colaborador: event.target.value }))}>
              <option value="">Selecione um colaborador</option>
              {colaboradorOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={submitDisabled}>{editingId ? 'Salvar edição' : 'Criar APR'}</button>
            <button type="button" className="ghost-button" onClick={() => { setForm(EMPTY_FORM); setEditingId(''); }}>Cancelar</button>
            <a className="ghost-button link-button" href={api.exportManualUrl(refMonth)}>Exportar CSV</a>
          </div>
        </form>
        {catalogMessage ? <p className="status-text">{catalogMessage}</p> : null}
        {status ? <p className="status-text">{status}</p> : null}
      </section>
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Base manual</p>
            <h3>{rows.length} registro(s)</h3>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>APR ID</th>
                <th>Data</th>
                <th>Assunto</th>
                <th>Colaborador</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.aprId}>
                  <td>{row.aprId}</td>
                  <td>{row.dataAbertura}</td>
                  <td>{row.assunto}</td>
                  <td>{row.colaborador}</td>
                  <td>
                    <div className="inline-actions">
                      <button type="button" className="ghost-button" onClick={() => { setEditingId(row.aprId); setForm({ aprId: row.aprId, dataAbertura: row.dataAbertura, assunto: row.assunto, colaborador: row.colaborador }); }}>Editar</button>
                      <button type="button" className="danger-button" onClick={() => handleDelete(row.aprId)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <div className="empty-state">Nenhum lançamento manual neste mês.</div> : null}
        </div>
      </section>
    </section>
  );
}
