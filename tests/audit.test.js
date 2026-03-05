import { describe, expect, test } from 'vitest';
import { compareBases, auditDivergentCount } from '../src/lib/audit.js';

describe('compareBases', () => {
  test('marks field-level changes as divergences', () => {
    const result = compareBases(
      [{ ID: '100', dataAbertura: '2026-03-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' }],
      [{ ID: '100', dataAbertura: '2026-03-01', assunto: 'PODAS', colaborador: 'Felipe' }],
    );

    expect(result.summary.conferido).toBe(0);
    expect(result.summary.divergente).toBe(1);
    expect(auditDivergentCount(result.summary)).toBe(1);
    expect(result.details[0].status).toBe('Divergente');
    expect(result.details[0].changed).toEqual(['Assunto']);
  });

  test('keeps exact matches as conferido', () => {
    const row = { ID: '200', dataAbertura: '2026-03-02', assunto: 'MAPEAMENTO', colaborador: 'Renan' };
    const result = compareBases([row], [row]);

    expect(result.summary.conferido).toBe(1);
    expect(result.summary.divergente).toBe(0);
    expect(result.details[0].status).toBe('Conferido');
  });
});
