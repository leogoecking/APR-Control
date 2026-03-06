import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { StatCard } from '../components/StatCard.jsx';

export function DashboardPage({ refMonth }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.monthSummary(refMonth)
      .then(data => {
        if (!active) return;
        setSummary(data);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message);
        setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refMonth]);

  return (
    <section className="page-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Resumo operacional</p>
          <h3>Auditoria central por mês</h3>
          <p>Servidor local, base centralizada em SQLite e regras unificadas no backend.</p>
        </div>
      </section>
      {loading ? <div className="panel">Carregando resumo...</div> : null}
      {error ? <div className="panel error-panel">{error}</div> : null}
      {summary ? (
        <>
          <section className="stats-grid">
            <StatCard label="Base manual" value={summary.manualCount} tone="default" />
            <StatCard label="Base sistema" value={summary.systemCount} tone="default" />
            <StatCard label="Divergências" value={summary.divergences} tone={summary.divergences ? 'danger' : 'success'} />
            <StatCard label="Conferidos" value={summary.summary.conferido} tone="success" />
          </section>
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Importações</p>
                <h3>Lotes do mês {refMonth}</h3>
              </div>
            </div>
            <div className="stack-list">
              {summary.imports.length ? summary.imports.map(batch => (
                <article key={batch.id} className="batch-card">
                  <strong>{batch.source.toUpperCase()}</strong>
                  <span>{batch.fileName || 'Sem arquivo'}</span>
                  <span>{batch.status}</span>
                  <span>Válidos: {batch.totalValid}</span>
                  <span>Inválidos: {batch.totalInvalid}</span>
                  <span>Duplicados: {batch.duplicates}</span>
                </article>
              )) : <div className="empty-state">Nenhum lote registrado para este mês.</div>}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
