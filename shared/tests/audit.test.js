import { describe, expect, test } from 'vitest';
import { compareBases, auditDivergentCount } from '../src/audit.js';

describe('compareBases', () => {
  test('treats missing IDs as divergences and field diffs as informative', () => {
    const result = compareBases(
      [
        { aprId: '100', dataAbertura: '2026-03-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' },
        { aprId: '200', dataAbertura: '2026-03-02', assunto: 'PODAS', colaborador: 'Renan' },
      ],
      [
        { aprId: '100', dataAbertura: '2026-03-01', assunto: 'DOCUMENTACAO', colaborador: 'Felipe' },
        { aprId: '300', dataAbertura: '2026-03-03', assunto: 'MAPEAMENTO', colaborador: 'Jose' },
      ],
    );

    expect(result.summary.conferido).toBe(1);
    expect(result.summary.soSistema).toBe(1);
    expect(result.summary.soManual).toBe(1);
    expect(auditDivergentCount(result.summary)).toBe(2);
    expect(result.details.find(item => item.aprId === '100')?.changed).toEqual(['Assunto']);
  });
});
