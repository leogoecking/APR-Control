import { DEFAULT_EMPLOYEES, EMPLOYEE_TOKEN_IGNORES } from './constants.js';

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeHeader(header) {
  return normalizeText(header).toLowerCase();
}

export function isValidIsoDate(dateStr) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= new Date(year, month, 0).getDate();
}

export function normalizeDateValue(value, xlsxRef) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && xlsxRef?.SSF) {
    try {
      const parsed = xlsxRef.SSF.parse_date_code(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        const iso = `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        if (isValidIsoDate(iso)) return iso;
      }
    } catch {
    }
  }
  const raw = String(value).trim();
  const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T].*)?$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    const iso = `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    return isValidIsoDate(iso) ? iso : raw;
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  if (iso) {
    const normalized = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    return isValidIsoDate(normalized) ? normalized : raw;
  }
  const isoSlash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ T].*)?$/);
  if (isoSlash) {
    const normalized = `${isoSlash[1]}-${isoSlash[2].padStart(2, '0')}-${isoSlash[3].padStart(2, '0')}`;
    return isValidIsoDate(normalized) ? normalized : raw;
  }
  const trimmed = raw.match(/^(\d{4}-\d{1,2}-\d{1,2})T/);
  if (trimmed) {
    const normalized = normalizeDateValue(trimmed[1], xlsxRef);
    if (isValidIsoDate(normalized)) return normalized;
  }
  return raw;
}

export function formatDateBr(value, emptyValue = '-') {
  const iso = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[1]}/${br[2]}/${br[3]}`;
  const raw = String(value ?? '').trim();
  return raw || emptyValue;
}

export function monthFromIsoDate(dateStr) {
  if (!isValidIsoDate(dateStr)) return '';
  return String(dateStr).slice(0, 7);
}

export function normalizeSubjectPattern(value) {
  const clean = String(value ?? '').trim().replace(/\s+/g, ' ');
  return clean ? clean.toLocaleUpperCase('pt-BR') : '';
}

export function employeeNameKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function employeeNameTokens(value) {
  return employeeNameKey(value)
    .split(' ')
    .filter(token => token && !EMPLOYEE_TOKEN_IGNORES.has(token));
}

export function canonicalEmployeeMatch(value, candidates = DEFAULT_EMPLOYEES) {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  const rawKey = employeeNameKey(raw);
  if (!rawKey) return raw;
  let best = null;
  const rawTokens = employeeNameTokens(raw);
  const rawTokenSet = new Set(rawTokens);
  candidates.forEach(candidate => {
    const candidateKey = employeeNameKey(candidate);
    if (!candidateKey) return;
    if (rawKey === candidateKey) {
      best = { name: candidate, score: 1 };
      return;
    }
    const candidateTokens = employeeNameTokens(candidate);
    if (!candidateTokens.length || !rawTokens.length) return;
    let common = 0;
    candidateTokens.forEach(token => {
      if (rawTokenSet.has(token)) common += 1;
    });
    const ratio = common / Math.max(rawTokens.length, candidateTokens.length);
    let score = ratio;
    if (rawKey.includes(candidateKey) || candidateKey.includes(rawKey)) score = Math.max(score, 0.9);
    if (common >= 2 && ratio >= 0.5) score = Math.max(score, 0.8);
    if (common >= 3 && ratio >= 0.6) score = Math.max(score, 0.9);
    if (!best || score > best.score) best = { name: candidate, score };
  });
  return best && best.score >= 0.8 ? best.name : raw;
}

export function normalizeEmployeeName(value, candidates = DEFAULT_EMPLOYEES) {
  return canonicalEmployeeMatch(value, candidates);
}
