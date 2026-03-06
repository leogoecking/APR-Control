export function compareMonthToPrevious(currentRows, previousRows, options = {}) {
  const { includeRemoved = false } = options;
  const currentMap = new Map((currentRows || []).map(row => [String(row.aprId ?? row.ID), row]));
  const previousMap = new Map((previousRows || []).map(row => [String(row.aprId ?? row.ID), row]));
  const ids = includeRemoved
    ? [...new Set([...currentMap.keys(), ...previousMap.keys()])]
    : [...currentMap.keys()];

  ids.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

  const summary = {
    totalAtual: currentMap.size,
    totalAnterior: previousMap.size,
    novo: 0,
    removido: 0,
    alterado: 0,
    semAlteracao: 0,
    totalIds: 0,
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
      if (!includeRemoved) return;
      status = 'Removido';
      summary.removido += 1;
    } else if (current && previous) {
      const currentDate = current.dataAbertura ?? current.data_abertura;
      const previousDate = previous.dataAbertura ?? previous.data_abertura;
      const currentAssunto = String(current.assunto ?? '').trim().toLowerCase();
      const previousAssunto = String(previous.assunto ?? '').trim().toLowerCase();
      const currentColaborador = String(current.colaborador ?? '').trim().toLowerCase();
      const previousColaborador = String(previous.colaborador ?? '').trim().toLowerCase();

      if (currentDate !== previousDate) changed.push('Data de abertura');
      if (currentAssunto !== previousAssunto) changed.push('Assunto');
      if (currentColaborador !== previousColaborador) changed.push('Colaborador');

      if (changed.length) {
        status = 'Alterado';
        summary.alterado += 1;
      } else {
        status = 'Sem alteração';
        summary.semAlteracao += 1;
      }
    } else {
      return;
    }

    details.push({ aprId: id, ID: id, status, changed, current, previous });
  });

  summary.totalIds = details.length;
  return { summary, details };
}
