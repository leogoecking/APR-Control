import { describe, expect, test } from 'vitest';
import { normalizeAndValidateRows, parseCsvText } from '../src/imports.js';

describe('imports', () => {
  test('parses csv with quoted delimiters', () => {
    const rows = parseCsvText('ID;Assunto\n1;"PODA; URGENTE"\n');
    expect(rows).toEqual([{ ID: '1', Assunto: 'PODA; URGENTE' }]);
  });

  test('normalizes spreadsheet rows and deduplicates by apr id', () => {
    const result = normalizeAndValidateRows([
      { ID: '10', 'Data de abertura': '01/03/2026', Assunto: 'Mapeamento', Colaborador: 'Felipe' },
      { ID: '10', 'Data de abertura': '02/03/2026', Assunto: 'Podas', Colaborador: 'Felipe' },
      { ID: '', 'Data de abertura': '02/03/2026', Assunto: 'Podas', Colaborador: 'Felipe' },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].aprId).toBe('10');
    expect(result.rows[0].dataAbertura).toBe('2026-03-02');
    expect(result.invalid).toContain('Linha 4: ID ausente');
    expect(result.duplicates).toEqual(['10']);
  });
});
