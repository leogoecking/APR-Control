import { useState } from 'react';
import { api } from '../api.js';

function UploadCard({ title, source, refMonth, onRefresh }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('Aguardando seleção do arquivo.');
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setStatus('Processando planilha...');
    try {
      const result = await api.importSource(refMonth, source, file);
      setStatus(`Importação concluída. Válidos: ${result.totalValid}. Inválidos: ${result.totalInvalid}. Duplicados: ${result.duplicates.length}.`);
      setFile(null);
      onRefresh();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Upload síncrono</p>
          <h3>{title}</h3>
        </div>
      </div>
      <label>
        {`Arquivo ${title}`}
        <input type="file" accept=".csv,.xlsx,.xls" onChange={event => setFile(event.target.files?.[0] || null)} />
      </label>
      <div className="form-actions">
        <button type="button" className="primary-button" disabled={!file || loading} onClick={handleUpload}>Enviar arquivo</button>
        <span className="status-text">{file ? `Arquivo selecionado: ${file.name}` : 'Nenhum arquivo selecionado.'}</span>
      </div>
      <p className="status-text">{status}</p>
    </article>
  );
}

export function ImportsPage({ refMonth, onRefresh }) {
  return (
    <section className="page-grid two-columns">
      <UploadCard title="Importar base manual" source="manual" refMonth={refMonth} onRefresh={onRefresh} />
      <UploadCard title="Importar base do sistema" source="system" refMonth={refMonth} onRefresh={onRefresh} />
    </section>
  );
}
