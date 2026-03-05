import { describe, expect, test } from 'vitest';
import { normalizeDateValue, isValidIsoDate, monthFromIsoDate } from '../src/lib/normalization.js';

describe('normalization', () => {
  test('normalizes dates from pt-BR and ISO formats', () => {
    expect(normalizeDateValue('05/03/2026')).toBe('2026-03-05');
    expect(normalizeDateValue('2026-3-5')).toBe('2026-03-05');
    expect(monthFromIsoDate('2026-03-05')).toBe('2026-03');
    expect(isValidIsoDate('2026-02-30')).toBe(false);
  });
});
