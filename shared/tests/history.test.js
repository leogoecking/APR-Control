import { describe, expect, test } from 'vitest';
import { compareMonthToPrevious } from '../src/history.js';

describe('compareMonthToPrevious', () => {
  test('does not include removed IDs by default', () => {
    const result = compareMonthToPrevious(
      [{ aprId: '1', dataAbertura: '2026-03-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' }],
      [
        { aprId: '1', dataAbertura: '2026-02-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' },
        { aprId: '2', dataAbertura: '2026-02-02', assunto: 'PODAS', colaborador: 'Renan' },
      ],
    );

    expect(result.summary.removido).toBe(0);
    expect(result.details.find(item => item.aprId === '2')).toBeUndefined();
  });
});
