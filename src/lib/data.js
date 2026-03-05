import {
  BACKUP_KEY,
  DB_KEY,
  MAX_BACKUP_BYTES,
  MAX_BACKUPS,
  SNAPSHOT_VERSION,
} from './constants.js';

export function initialDb() {
  return {
    months: {},
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function safeParseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function normalizeEntryShape(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const ID = String(entry.ID ?? '').trim();
  if (!ID) return null;
  return {
    ID,
    dataAbertura: String(entry.dataAbertura ?? '').trim(),
    assunto: String(entry.assunto ?? '').trim(),
    colaborador: String(entry.colaborador ?? '').trim(),
  };
}

export function normalizeMonthPackShape(pack) {
  const manual = Array.isArray(pack?.manual) ? pack.manual.map(normalizeEntryShape).filter(Boolean) : [];
  const system = Array.isArray(pack?.system) ? pack.system.map(normalizeEntryShape).filter(Boolean) : [];
  const imports = pack && typeof pack.imports === 'object' && !Array.isArray(pack.imports) ? pack.imports : {};
  return { manual, system, imports };
}

export function normalizeDbShape(db) {
  const now = new Date().toISOString();
  const safe = { months: {}, meta: { createdAt: now, updatedAt: now } };
  if (!db || typeof db !== 'object') return safe;
  const rawMonths = db.months && typeof db.months === 'object' && !Array.isArray(db.months) ? db.months : {};
  Object.entries(rawMonths).forEach(([month, pack]) => {
    if (!/^\d{4}-\d{2}$/.test(String(month))) return;
    safe.months[month] = normalizeMonthPackShape(pack);
  });
  const rawMeta = db.meta && typeof db.meta === 'object' && !Array.isArray(db.meta) ? db.meta : {};
  safe.meta.createdAt = typeof rawMeta.createdAt === 'string' && rawMeta.createdAt ? rawMeta.createdAt : now;
  safe.meta.updatedAt = typeof rawMeta.updatedAt === 'string' && rawMeta.updatedAt ? rawMeta.updatedAt : now;
  return safe;
}

export function parseDbString(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parsed = safeParseJson(raw, null);
  if (!parsed || typeof parsed !== 'object') return null;
  return normalizeDbShape(parsed);
}

export function cloneDb(db) {
  try {
    return normalizeDbShape(JSON.parse(JSON.stringify(normalizeDbShape(db))));
  } catch {
    return normalizeDbShape(db);
  }
}

export function integrityChecksum(at, reason, data) {
  let hash = 2166136261;
  const subject = `${SNAPSHOT_VERSION}|${at}|${reason}|${data}|${DB_KEY}`;
  for (let index = 0; index < subject.length; index += 1) {
    hash ^= subject.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function snapshotFromRaw(data, reason, at) {
  const safeAt = typeof at === 'string' && at ? at : new Date().toISOString();
  const safeReason = String(reason ?? '');
  const safeData = String(data ?? '');
  return {
    v: SNAPSHOT_VERSION,
    at: safeAt,
    reason: safeReason,
    data: safeData,
    checksum: integrityChecksum(safeAt, safeReason, safeData),
  };
}

export function normalizeSnapshotEnvelope(item) {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.data !== 'string' || !item.data) return null;
  const parsedDb = parseDbString(item.data);
  if (!parsedDb) return null;
  const at = typeof item.at === 'string' && item.at ? item.at : new Date().toISOString();
  const reason = String(item.reason ?? '');
  const isV1 = Number(item.v) === SNAPSHOT_VERSION;
  const checksum = typeof item.checksum === 'string' ? item.checksum : '';
  if (isV1 && checksum) {
    if (checksum !== integrityChecksum(at, reason, item.data)) return null;
    return { v: SNAPSHOT_VERSION, at, reason, data: item.data, checksum };
  }
  return snapshotFromRaw(JSON.stringify(parsedDb), reason, at);
}

export function backupListBytes(list) {
  return new Blob([JSON.stringify(list)]).size;
}

export function compactBackupList(list) {
  while (list.length > MAX_BACKUPS) list.shift();
  while (list.length > 1 && backupListBytes(list) > MAX_BACKUP_BYTES) list.shift();
  return list;
}

export function readBackupList(storage = globalThis.localStorage) {
  const raw = safeParseJson(storage?.getItem?.(BACKUP_KEY) || '[]', []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSnapshotEnvelope).filter(Boolean);
}

export function persistBackupList(list, storage = globalThis.localStorage) {
  if (!list.length) {
    storage?.removeItem?.(BACKUP_KEY);
    return true;
  }
  storage?.setItem?.(BACKUP_KEY, JSON.stringify(list));
  return true;
}

export function saveBackupsSnapshot(db, reason, storage = globalThis.localStorage) {
  try {
    const list = compactBackupList(readBackupList(storage));
    list.push(snapshotFromRaw(JSON.stringify(normalizeDbShape(db)), reason, new Date().toISOString()));
    compactBackupList(list);
    while (list.length) {
      try {
        return persistBackupList(list, storage);
      } catch {
        list.shift();
        compactBackupList(list);
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function ensureMonthPack(db, month) {
  db.months[month] = db.months[month] || { manual: [], system: [], imports: {} };
  return db.months[month];
}
