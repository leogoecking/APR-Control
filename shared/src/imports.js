import * as XLSX from 'xlsx';
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
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

export function spreadsheetSupportMessage() {
  return 'Biblioteca Excel indisponível no momento. Para importar offline, converta a planilha para CSV.';
}

export function parseSpreadsheetBuffer(buffer, fileName) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    let text = new TextDecoder('utf-8').decode(buffer);
    if (csvMaybeBroken(text)) text = decodeWindows1252(buffer);
    return parseCsvText(text);
  }
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
}

export function mapRow(row, employees = DEFAULT_EMPLOYEES) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });
  return {
    aprId: String(normalized.id ?? normalized.codigo ?? normalized['codigo apr'] ?? normalized.apr ?? '').trim(),
    dataAbertura: normalizeDateValue(
      normalized['data de abertura'] ?? normalized['data abertura'] ?? normalized.abertura ?? normalized.data ?? '',
      XLSX,
    ),
    assunto: normalizeSubjectPattern(normalized.assunto ?? normalized.descricao ?? ''),
    colaborador: normalizeEmployeeName(
      normalized.colaborador ?? normalized.funcionario ?? normalized.responsavel ?? '',
      employees,
    ),
  };
}

export function normalizeAndValidateRows(rawRows, employees = DEFAULT_EMPLOYEES) {
  const rows = [];
  const invalid = [];
  const duplicates = [];
  const rowIndexById = new Map();
  rawRows.forEach((row, idx) => {
    const normalized = mapRow(row, employees);
    const line = idx + 2;
    if (!normalized.aprId) {
      invalid.push(`Linha ${line}: ID ausente`);
      return;
    }
    if (!monthFromIsoDate(normalized.dataAbertura)) {
      invalid.push(`Linha ${line}: Data de abertura ausente/inválida`);
      return;
    }
    if (!normalized.assunto) {
      invalid.push(`Linha ${line}: Assunto ausente`);
      return;
    }
    if (!normalized.colaborador) {
      invalid.push(`Linha ${line}: Colaborador ausente`);
      return;
    }
    if (rowIndexById.has(normalized.aprId)) {
      duplicates.push(normalized.aprId);
      rows[rowIndexById.get(normalized.aprId)] = normalized;
      return;
    }
    rowIndexById.set(normalized.aprId, rows.length);
    rows.push(normalized);
  });
  return {
    rows,
    invalid,
    duplicates: [...new Set(duplicates)],
  };
}

export function assignRowsToReferenceMonth(rows, refMonth, source) {
  return (rows || []).map(row => ({
    refMonth,
    source,
    aprId: row.aprId,
    dataAbertura: row.dataAbertura,
    assunto: row.assunto,
    colaborador: row.colaborador,
  }));
}
