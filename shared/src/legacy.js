import { RECORD_SOURCES } from './constants.js';

export function parseLegacyDb(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || typeof parsed.months !== 'object') {
    throw new Error('Base legada inválida.');
  }
  return parsed;
}

export function flattenLegacyDb(rawDb) {
  const db = parseLegacyDb(rawDb);
  const records = [];
  const months = [];
  Object.entries(db.months || {}).forEach(([refMonth, pack]) => {
    months.push({ refMonth, createdAt: new Date().toISOString() });
    RECORD_SOURCES.forEach(source => {
      const rows = Array.isArray(pack?.[source]) ? pack[source] : [];
      rows.forEach(row => {
        records.push({
          refMonth,
          source,
          aprId: String(row.ID ?? '').trim(),
          dataAbertura: String(row.dataAbertura ?? '').trim(),
          assunto: String(row.assunto ?? '').trim(),
          colaborador: String(row.colaborador ?? '').trim(),
          importedAt: pack?.imports?.[source]?.importedAt ?? null,
        });
      });
    });
  });
  return { months, records, meta: db.meta || {} };
}

export function buildLegacySnapshot(rows) {
  const months = {};
  rows.forEach(row => {
    const refMonth = row.refMonth;
    const source = row.source;
    months[refMonth] = months[refMonth] || { manual: [], system: [], imports: {} };
    months[refMonth][source].push({
      ID: row.aprId,
      dataAbertura: row.dataAbertura,
      assunto: row.assunto,
      colaborador: row.colaborador,
    });
  });
  return {
    months,
    meta: {
      exportedAt: new Date().toISOString(),
    },
  };
}
