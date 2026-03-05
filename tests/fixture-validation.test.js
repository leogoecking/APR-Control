import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const fixturePath = path.resolve('APR Control.json');

describe('APR Control fixture', () => {
  test('keeps month keys aligned with row dates and without duplicate IDs per month/source', () => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const issues = [];

    for (const [month, pack] of Object.entries(fixture.months || {})) {
      for (const source of ['manual', 'system']) {
        const rows = Array.isArray(pack[source]) ? pack[source] : [];
        const seen = new Set();
        for (const row of rows) {
          if (seen.has(row.ID)) {
            issues.push(`duplicate:${month}:${source}:${row.ID}`);
          }
          seen.add(row.ID);
          if (String(row.dataAbertura || '').slice(0, 7) !== month) {
            issues.push(`month-mismatch:${month}:${source}:${row.ID}:${row.dataAbertura}`);
          }
        }
      }
    }

    expect(issues).toEqual([]);
  });
});
