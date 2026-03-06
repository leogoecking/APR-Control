import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { flattenLegacyDb, parseLegacyDb } from '../src/legacy.js';

const fixturePath = path.resolve(process.cwd(), '../APR Control.json');

describe('legacy migration', () => {
  test('loads the legacy JSON and flattens rows', () => {
    const parsed = parseLegacyDb(fs.readFileSync(fixturePath, 'utf8'));
    const flattened = flattenLegacyDb(parsed);

    expect(Object.keys(parsed.months).length).toBeGreaterThan(0);
    expect(flattened.records.length).toBeGreaterThan(0);
    expect(flattened.records[0]).toHaveProperty('refMonth');
    expect(flattened.records[0]).toHaveProperty('source');
  });
});
