import { describe, expect, test } from 'vitest';
import { normalizeDateValue, monthFromIsoDate, normalizeEmployeeName } from '../src/normalization.js';

describe('normalization', () => {
  test('normalizes dates and employee names', () => {
    expect(normalizeDateValue('05/03/2026')).toBe('2026-03-05');
    expect(monthFromIsoDate('2026-03-05')).toBe('2026-03');
    expect(normalizeEmployeeName('joao pedro almeida')).toBe('JOÃO PEDRO DO CARMO ALMEIDA');
  });
});
