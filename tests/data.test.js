import { describe, expect, test } from 'vitest';
import { normalizeSnapshotEnvelope, saveBackupsSnapshot } from '../src/lib/data.js';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

describe('backup helpers', () => {
  test('rejects snapshots with invalid checksum', () => {
    const result = normalizeSnapshotEnvelope({
      v: 1,
      at: '2026-03-05T00:00:00.000Z',
      reason: 'teste',
      data: '{"months":{},"meta":{"createdAt":"2026-03-05T00:00:00.000Z","updatedAt":"2026-03-05T00:00:00.000Z"}}',
      checksum: 'deadbeef',
    });

    expect(result).toBeNull();
  });

  test('stores snapshots in provided storage', () => {
    const storage = createStorage();
    const ok = saveBackupsSnapshot({ months: {}, meta: {} }, 'teste', storage);

    expect(ok).toBe(true);
    expect(storage.getItem('apr_control_local_v4_backups')).toContain('teste');
  });
});
