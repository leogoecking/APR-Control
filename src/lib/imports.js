import { DEFAULT_EMPLOYEES } from './constants.js';
import {
  monthFromIsoDate,
  normalizeDateValue,
  normalizeEmployeeName,
  normalizeHeader,
  normalizeSubjectPattern,
} from './normalization.js';

export function csvMaybeBroken(text) {
  return /�/.test(text);
}

export function decodeWindows1252(buffer) {
  try {
    return new TextDecoder('windows-1252').decode(buffer);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

export function parseCsvText(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  function parseLine(line) {
    const output = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const ch = line[index];
      if (ch === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (ch === delimiter && !quoted) {
        output.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    output.push(current);
    return output.map(value => value.trim());
  }
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseLine(lines[index]);
    if (!values.length) continue;
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

export function spreadsheetSupportMessage() {
  return 'Biblioteca Excel indisponível no momento. Para importar offline, converta a planilha para CSV.';
}

export function isSpreadsheetLibraryAvailable(xlsxRef = globalThis.XLSX) {
  return Boolean(xlsxRef);
}

export function assertSpreadsheetLibraryAvailable(xlsxRef = globalThis.XLSX) {
  if (!isSpreadsheetLibraryAvailable(xlsxRef)) {
    throw new Error(spreadsheetSupportMessage());
  }
}

export function mapRow(row, employees = DEFAULT_EMPLOYEES, xlsxRef = globalThis.XLSX) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });
  return {
    ID: String(normalized.id ?? normalized.codigo ?? normalized['codigo apr'] ?? normalized.apr ?? '').trim(),
    dataAbertura: normalizeDateValue(
      normalized['data de abertura'] ?? normalized['data abertura'] ?? normalized.abertura ?? normalized.data ?? '',
      xlsxRef,
    ),
    assunto: normalizeSubjectPattern(normalized.assunto ?? normalized.descricao ?? ''),
    colaborador: normalizeEmployeeName(
      normalized.colaborador ?? normalized.funcionario ?? normalized.responsavel ?? '',
      employees,
    ),
  };
}

export function normalizeAndValidateRows(rawRows, employees = DEFAULT_EMPLOYEES, xlsxRef = globalThis.XLSX) {
  const rows = [];
  const invalid = [];
  const duplicates = [];
  const rowIndexById = new Map();
  const idMonthMap = new Map();
  const invalidByMonth = new Map();
  const duplicatesByMonth = new Map();

  function addInvalidMonth(month) {
    if (!month) return;
    invalidByMonth.set(month, (invalidByMonth.get(month) || 0) + 1);
  }

  function addDuplicateMonth(month, id) {
    if (!month || !id) return;
    if (!duplicatesByMonth.has(month)) duplicatesByMonth.set(month, new Set());
    duplicatesByMonth.get(month).add(id);
  }

  rawRows.forEach((row, idx) => {
    const normalized = mapRow(row, employees, xlsxRef);
    const line = idx + 2;
    const rowMonth = monthFromIsoDate(normalized.dataAbertura);
    if (!normalized.ID) {
      invalid.push(`Linha ${line}: ID ausente`);
      addInvalidMonth(rowMonth);
      return;
    }
    if (!monthFromIsoDate(normalized.dataAbertura)) {
      invalid.push(`Linha ${line}: Data de abertura ausente/inválida`);
      addInvalidMonth(rowMonth);
      return;
    }
    if (!normalized.assunto) {
      invalid.push(`Linha ${line}: Assunto ausente`);
      addInvalidMonth(rowMonth);
      return;
    }
    if (!normalized.colaborador) {
      invalid.push(`Linha ${line}: Colaborador ausente`);
      addInvalidMonth(rowMonth);
      return;
    }
    if (rowIndexById.has(normalized.ID)) {
      duplicates.push(normalized.ID);
      addDuplicateMonth(rowMonth, normalized.ID);
      addDuplicateMonth(idMonthMap.get(normalized.ID) || '', normalized.ID);
      rows[rowIndexById.get(normalized.ID)] = normalized;
      idMonthMap.set(normalized.ID, rowMonth);
      return;
    }
    rowIndexById.set(normalized.ID, rows.length);
    rows.push(normalized);
    idMonthMap.set(normalized.ID, rowMonth);
  });

  return {
    rows,
    invalid,
    duplicates: [...new Set(duplicates)],
    invalidByMonth,
    duplicatesByMonth,
  };
}

export function groupRowsByDateMonth(rows, fallbackMonth) {
  const grouped = new Map();
  (rows || []).forEach(row => {
    const month = fallbackMonth || monthFromIsoDate(row?.dataAbertura || '');
    if (!month) return;
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month).push(row);
  });
  return grouped;
}

export function monthImportSummary(grouped) {
  return [...grouped.entries()].map(([month, rows]) => `${month} (${rows.length})`).join(', ');
}
