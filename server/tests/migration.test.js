import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createDatabase } from '../src/db.js';
import { createAprService } from '../src/services/apr-service.js';

describe('legacy migration', () => {
  test('imports APR Control.json into SQLite', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apr-control-migration-'));
    const dbPath = path.join(dir, 'app.db');
    const db = createDatabase(dbPath);
    const service = createAprService(db);
    const result = service.migrateLegacyFile(path.resolve(process.cwd(), '../APR Control.json'));

    expect(result.months).toBeGreaterThan(0);
    expect(result.records).toBeGreaterThan(0);
    expect(service.listMonths().length).toBeGreaterThan(0);

    db.close();
  });
});
