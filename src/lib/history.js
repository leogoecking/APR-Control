import { buildMap } from './audit.js';
import { normalizeText } from './normalization.js';

export function compareMonthToPrevious(currentRows, previousRows) {
  const currentMap = buildMap(currentRows);
  const previousMap = buildMap(previousRows);
  const ids = [...new Set([...currentMap.keys(), ...previousMap.keys()])].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR', { numeric: true }),
  );
  const summary = {
    totalAtual: currentMap.size,
    totalAnterior: previousMap.size,
    novo: 0,
    removido: 0,
    alterado: 0,
    semAlteracao: 0,
    totalIds: ids.length,
  };
  const details = [];
  ids.forEach(id => {
    const current = currentMap.get(id) || null;
    const previous = previousMap.get(id) || null;
    const changed = [];
    let status = '';
    if (!previous && current) {
      status = 'Novo';
      summary.novo += 1;
    } else if (previous && !current) {
      status = 'Removido';
      summary.removido += 1;
    } else if (current && previous) {
      if (current.dataAbertura !== previous.dataAbertura) changed.push('Data de abertura');
      if (normalizeText(current.assunto) !== normalizeText(previous.assunto)) changed.push('Assunto');
      if (normalizeText(current.colaborador) !== normalizeText(previous.colaborador)) changed.push('Colaborador');
      if (changed.length) {
        status = 'Alterado';
        summary.alterado += 1;
      } else {
        status = 'Sem alteração';
        summary.semAlteracao += 1;
      }
    }
    details.push({ ID: id, status, changed, current, previous });
  });
  return { summary, details };
}
