import { describe, expect, test } from 'vitest';
import { normalizeAndValidateRows, parseCsvText, spreadsheetSupportMessage, assertSpreadsheetLibraryAvailable } from '../src/lib/imports.js';

describe('import helpers', () => {
  test('parses quoted csv values with semicolon delimiter', () => {
    const rows = parseCsvText('ID;Assunto\n1;"PODA; URGENTE"\n');
    expect(rows).toEqual([{ ID: '1', Assunto: 'PODA; URGENTE' }]);
  });

  test('normalizes and de-duplicates imported rows', () => {
    const result = normalizeAndValidateRows([
      { ID: '1', 'Data de abertura': '01/03/2026', Assunto: 'Mapeamento', Colaborador: 'Felipe' },
      { ID: '1', 'Data de abertura': '02/03/2026', Assunto: 'Podas', Colaborador: 'Felipe' },
      { ID: '', 'Data de abertura': '02/03/2026', Assunto: 'Podas', Colaborador: 'Felipe' },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].dataAbertura).toBe('2026-03-02');
    expect(result.duplicates).toEqual(['1']);
    expect(result.invalid).toContain('Linha 4: ID ausente');
  });

  test('returns a clear offline spreadsheet message', () => {
    expect(spreadsheetSupportMessage()).toMatch(/CSV/);
    expect(() => assertSpreadsheetLibraryAvailable(null)).toThrow(/CSV/);
  });
});
