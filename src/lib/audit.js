import { normalizeText } from './normalization.js';

export function buildMap(rows) {
  const map = new Map();
  (rows || []).forEach(row => map.set(row.ID, row));
  return map;
}

export function compareBases(systemRows, manualRows) {
  const systemMap = buildMap(systemRows);
  const manualMap = buildMap(manualRows);
  const ids = [...new Set([...systemMap.keys(), ...manualMap.keys()])].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR', { numeric: true }),
  );
  const summary = {
    totalSistema: systemMap.size,
    totalManual: manualMap.size,
    conferido: 0,
    divergente: 0,
    soSistema: 0,
    soManual: 0,
    totalIds: ids.length,
  };
  const details = [];
  ids.forEach(id => {
    const system = systemMap.get(id) || null;
    const manual = manualMap.get(id) || null;
    const changed = [];
    let status = '';
    if (system && manual) {
      if (system.dataAbertura !== manual.dataAbertura) changed.push('Data de abertura');
      if (normalizeText(system.assunto) !== normalizeText(manual.assunto)) changed.push('Assunto');
      if (normalizeText(system.colaborador) !== normalizeText(manual.colaborador)) changed.push('Colaborador');
      if (changed.length) {
        status = 'Divergente';
        summary.divergente += 1;
      } else {
        status = 'Conferido';
        summary.conferido += 1;
      }
    } else if (system && !manual) {
      status = 'Só no sistema';
      summary.soSistema += 1;
    } else {
      status = 'Só no manual';
      summary.soManual += 1;
    }
    details.push({ ID: id, status, changed, system, manual });
  });
  return { summary, details };
}

export function auditDivergentCount(summary) {
  return (summary?.divergente || 0) + (summary?.soSistema || 0) + (summary?.soManual || 0);
}
