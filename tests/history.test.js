import { describe, expect, test } from 'vitest';
import { compareMonthToPrevious } from '../src/lib/history.js';

describe('compareMonthToPrevious', () => {
  test('includes removed rows from previous month', () => {
    const result = compareMonthToPrevious(
      [{ ID: '300', dataAbertura: '2026-03-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' }],
      [
        { ID: '300', dataAbertura: '2026-03-01', assunto: 'MAPEAMENTO', colaborador: 'Felipe' },
        { ID: '301', dataAbertura: '2026-02-25', assunto: 'PODAS', colaborador: 'Venicio' },
      ],
    );

    expect(result.summary.removido).toBe(1);
    expect(result.details.find(item => item.ID === '301')?.status).toBe('Removido');
  });
});
