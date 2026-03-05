import { BACKUP_KEY, DB_KEY, DEFAULT_EMPLOYEES, DEFAULT_SUBJECTS, FIXED_BACKUP_FILE, FS_BACKUP_DIR_KEY, FS_DB, FS_MAIN_DB_KEY, FS_STORE, MAX_EMPLOYEE_SUGGESTIONS, TAB_KEY } from './lib/constants.js';
import { auditDivergentCount, compareBases as compareBasesModule } from './lib/audit.js';
import { compareMonthToPrevious as compareMonthToPreviousModule } from './lib/history.js';
import { cloneDb as cloneDbModule, compactBackupList as compactBackupListModule, ensureMonthPack as ensureMonthPackModule, initialDb as initialDbModule, normalizeDbShape as normalizeDbShapeModule, normalizeSnapshotEnvelope as normalizeSnapshotEnvelopeModule, parseDbString as parseDbStringModule, persistBackupList as persistBackupListModule, readBackupList as readBackupListModule, safeParseJson as safeParseJsonModule, saveBackupsSnapshot as saveBackupsSnapshotModule } from './lib/data.js';
import { assertSpreadsheetLibraryAvailable, csvMaybeBroken as csvMaybeBrokenModule, decodeWindows1252 as decodeWindows1252Module, groupRowsByDateMonth as groupRowsByDateMonthModule, monthImportSummary as monthImportSummaryModule, normalizeAndValidateRows as normalizeAndValidateRowsModule, parseCsvText as parseCsvTextModule, spreadsheetSupportMessage } from './lib/imports.js';
import { escapeHtml as escapeHtmlModule, formatDateBr as formatDateBrModule, monthFromIsoDate as monthFromIsoDateModule, normalizeDateValue as normalizeDateValueModule, normalizeEmployeeName as normalizeEmployeeNameModule, normalizeHeader as normalizeHeaderModule, normalizeSubjectPattern as normalizeSubjectPatternModule, normalizeText as normalizeTextModule } from './lib/normalization.js';

        const EMPLOYEE_TOKEN_IGNORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
        const $ = id => document.getElementById(id);
        const els = { monthRef: $('monthRef'), monthRefInfo: $('monthRefInfo'), btnPrevMonth: $('btnPrevMonth'), btnCurrentMonth: $('btnCurrentMonth'), btnNextMonth: $('btnNextMonth'), systemFile: $('systemFile'), backupJsonFile: $('backupJsonFile'), historySource: $('historySource'), searchAudit: $('searchAudit'), filterAuditEmployee: $('filterAuditEmployee'), filterAuditDate: $('filterAuditDate'), filterAuditSubject: $('filterAuditSubject'), statusBox: $('statusBox'), btnImportSystem: $('btnImportSystem'), btnCompare: $('btnCompare'), btnShowAllAudit: $('btnShowAllAudit'), btnShowOnlyMissing: $('btnShowOnlyMissing'), btnExportMissingCsv: $('btnExportMissingCsv'), btnExportJson: $('btnExportJson'), btnImportJson: $('btnImportJson'), btnRestoreLastBackup: $('btnRestoreLastBackup'), btnClearMonth: $('btnClearMonth'), btnClearAll: $('btnClearAll'), manualId: $('manualId'), manualDate: $('manualDate'), manualSubject: $('manualSubject'), subjectSuggestions: $('subjectSuggestions'), manualEmployee: $('manualEmployee'), employeeSuggestions: $('employeeSuggestions'), manualFile: $('manualFile'), btnImportManual: $('btnImportManual'), btnSaveManual: $('btnSaveManual'), btnCancelEdit: $('btnCancelEdit'), btnExportManualCsv: $('btnExportManualCsv'), manualEditInfo: $('manualEditInfo'), modalOverlay: $('modalOverlay'), modalTitle: $('modalTitle'), modalMessage: $('modalMessage'), modalActions: $('modalActions'), tabNav: $('tabNav'), tabBtnAuditoria: $('tabBtnAuditoria'), tabBtnHistorico: $('tabBtnHistorico'), tabBtnDashboard: $('tabBtnDashboard'), tabPanelAuditoria: $('tabPanelAuditoria'), tabPanelHistorico: $('tabPanelHistorico'), tabPanelDashboard: $('tabPanelDashboard'), dashboardCards: $('dashboardCards'), manualCards: $('manualCards'), manualTableArea: $('manualTableArea'), auditCards: $('auditCards'), auditTableArea: $('auditTableArea'), historyCards: $('historyCards'), historyTableArea: $('historyTableArea'), monthsList: $('monthsList') };
        let auditFilterMode = 'all', currentEditId = null, currentTab = 'auditoria', backupDirectoryHandle = null, activeModalResolver = null, mainDbCache = null, primaryStorageMode = 'localStorage', indexedDbCapable = false, mainDbWriteQueue = Promise.resolve(true);
        function initialDb() { return { months: {}, meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } }
        function safeParseJson(raw, fallback) { try { return JSON.parse(raw) } catch { return fallback } }
        function openFsDb() {
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) return reject(new Error('indexedDB indisponível'));
                const req = indexedDB.open(FS_DB, 1);
                req.onupgradeneeded = () => {
                    if (!req.result.objectStoreNames.contains(FS_STORE)) req.result.createObjectStore(FS_STORE);
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error || new Error('Falha ao abrir base local de handles'));
            });
        }
        async function readStoredHandle(key) {
            try {
                const db = await openFsDb();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(FS_STORE, 'readonly'), store = tx.objectStore(FS_STORE), req = store.get(key);
                    req.onsuccess = () => { db.close(); resolve(req.result || null) };
                    req.onerror = () => { db.close(); reject(req.error || new Error('Falha ao ler handle salvo')) };
                });
            } catch {
                return null;
            }
        }
        async function writeStoredHandle(key, value) {
            try {
                const db = await openFsDb();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(FS_STORE, 'readwrite'), store = tx.objectStore(FS_STORE), req = store.put(value, key);
                    req.onsuccess = () => { db.close(); resolve(true) };
                    req.onerror = () => { db.close(); reject(req.error || new Error('Falha ao salvar handle')) };
                });
            } catch {
                return false;
            }
        }
        async function deleteStoredValue(key) {
            try {
                const db = await openFsDb();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(FS_STORE, 'readwrite'), store = tx.objectStore(FS_STORE), req = store.delete(key);
                    req.onsuccess = () => { db.close(); resolve(true) };
                    req.onerror = () => { db.close(); reject(req.error || new Error('Falha ao remover valor salvo')) };
                });
            } catch {
                return false;
            }
        }
        function cloneDb(db) { return cloneDbModule(db) }
        function persistMainDbLocal(rawDb) { try { localStorage.setItem(DB_KEY, rawDb); return true } catch { return reclaimSpaceForMainDb(rawDb) } }
        function queueMainDbIndexedSave(dbValue) {
            if (!indexedDbCapable && primaryStorageMode !== 'indexedDB') return Promise.resolve(false);
            const snapshot = cloneDb(dbValue);
            const queued = mainDbWriteQueue.then(() => writeStoredHandle(FS_MAIN_DB_KEY, snapshot)).then(ok => {
                if (ok) {
                    indexedDbCapable = true;
                    primaryStorageMode = 'indexedDB';
                    return true;
                }
                indexedDbCapable = false;
                if (primaryStorageMode === 'indexedDB') primaryStorageMode = 'localStorage';
                return false;
            }).catch(() => {
                indexedDbCapable = false;
                if (primaryStorageMode === 'indexedDB') primaryStorageMode = 'localStorage';
                return false;
            });
            mainDbWriteQueue = queued.then(() => undefined, () => undefined);
            return queued;
        }
        async function bootstrapStorageAdapter() {
            const indexedDbRaw = await readStoredHandle(FS_MAIN_DB_KEY);
            if (indexedDbRaw && typeof indexedDbRaw === 'object') {
                mainDbCache = normalizeDbShape(indexedDbRaw);
                indexedDbCapable = true;
                primaryStorageMode = 'indexedDB';
                try { localStorage.setItem(DB_KEY, JSON.stringify(mainDbCache)) } catch { }
                return;
            }
            const localDb = parseDbString(localStorage.getItem(DB_KEY) || '');
            if (localDb) {
                mainDbCache = normalizeDbShape(localDb);
                const migrated = await writeStoredHandle(FS_MAIN_DB_KEY, mainDbCache);
                indexedDbCapable = !!migrated;
                primaryStorageMode = migrated ? 'indexedDB' : 'localStorage';
                return;
            }
            mainDbCache = initialDb();
            const seeded = await writeStoredHandle(FS_MAIN_DB_KEY, mainDbCache);
            indexedDbCapable = !!seeded;
            primaryStorageMode = seeded ? 'indexedDB' : 'localStorage';
            if (!seeded) {
                try { localStorage.setItem(DB_KEY, JSON.stringify(mainDbCache)) } catch { }
            }
        }
        function normalizeEntryShape(entry) { if (!entry || typeof entry !== 'object') return null; const ID = String(entry.ID ?? '').trim(); if (!ID) return null; return { ID, dataAbertura: String(entry.dataAbertura ?? '').trim(), assunto: String(entry.assunto ?? '').trim(), colaborador: String(entry.colaborador ?? '').trim() } }
        function normalizeMonthPackShape(pack) { const manual = Array.isArray(pack?.manual) ? pack.manual.map(normalizeEntryShape).filter(Boolean) : [], system = Array.isArray(pack?.system) ? pack.system.map(normalizeEntryShape).filter(Boolean) : [], imports = (pack && typeof pack.imports === 'object' && !Array.isArray(pack.imports)) ? pack.imports : {}; return { manual, system, imports } }
        function normalizeDbShape(db) { const now = new Date().toISOString(), safe = { months: {}, meta: { createdAt: now, updatedAt: now } }; if (!db || typeof db !== 'object') return safe; const rawMonths = (db.months && typeof db.months === 'object' && !Array.isArray(db.months)) ? db.months : {}; Object.entries(rawMonths).forEach(([month, pack]) => { if (!/^\d{4}-\d{2}$/.test(String(month))) return; safe.months[month] = normalizeMonthPackShape(pack) }); const rawMeta = (db.meta && typeof db.meta === 'object' && !Array.isArray(db.meta)) ? db.meta : {}; safe.meta.createdAt = typeof rawMeta.createdAt === 'string' && rawMeta.createdAt ? rawMeta.createdAt : now; safe.meta.updatedAt = typeof rawMeta.updatedAt === 'string' && rawMeta.updatedAt ? rawMeta.updatedAt : now; return safe }
        function parseDbString(raw) { if (typeof raw !== 'string' || !raw.trim()) return null; const parsed = safeParseJson(raw, null); if (!parsed || typeof parsed !== 'object') return null; return normalizeDbShape(parsed) }
        function loadDb() {
            if (mainDbCache) return cloneDb(mainDbCache);
            const raw = localStorage.getItem(DB_KEY);
            if (!raw) { mainDbCache = initialDb(); return cloneDb(mainDbCache) }
            const db = parseDbString(raw);
            mainDbCache = db || initialDb();
            return cloneDb(mainDbCache);
        }
        function integrityChecksum(at, reason, data) { let h = 2166136261, str = `${SNAPSHOT_VERSION}|${at}|${reason}|${data}|${DB_KEY}`; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16).padStart(8, '0') }
        function snapshotFromRaw(data, reason, at) { const safeAt = typeof at === 'string' && at ? at : new Date().toISOString(), safeReason = String(reason ?? ''), safeData = String(data ?? ''); return { v: SNAPSHOT_VERSION, at: safeAt, reason: safeReason, data: safeData, checksum: integrityChecksum(safeAt, safeReason, safeData) } }
        function normalizeSnapshotEnvelope(item) { if (!item || typeof item !== 'object') return null; if (typeof item.data !== 'string' || !item.data) return null; const parsedDb = parseDbString(item.data); if (!parsedDb) return null; const at = typeof item.at === 'string' && item.at ? item.at : new Date().toISOString(), reason = String(item.reason ?? ''), isV1 = Number(item.v) === SNAPSHOT_VERSION, checksum = typeof item.checksum === 'string' ? item.checksum : ''; if (isV1 && checksum) { if (checksum !== integrityChecksum(at, reason, item.data)) return null; return { v: SNAPSHOT_VERSION, at, reason, data: item.data, checksum } } return snapshotFromRaw(JSON.stringify(parsedDb), reason, at) }
        function readBackupList() { const raw = safeParseJson(localStorage.getItem(BACKUP_KEY) || '[]', []); if (!Array.isArray(raw)) return []; return raw.map(normalizeSnapshotEnvelope).filter(Boolean) }
        function backupListBytes(list) { return new Blob([JSON.stringify(list)]).size }
        function compactBackupList(list) { return compactBackupListModule(list) }
        function persistBackupList(list) { if (!list.length) { localStorage.removeItem(BACKUP_KEY); return true } localStorage.setItem(BACKUP_KEY, JSON.stringify(list)); return true }
        function saveBackupsSnapshot(db, reason) { try { const list = compactBackupList(readBackupList()); list.push(snapshotFromRaw(JSON.stringify(normalizeDbShape(db)), reason, new Date().toISOString())); compactBackupList(list); while (list.length) { try { return persistBackupList(list) } catch { list.shift(); compactBackupList(list) } } return false } catch { return false } }
        function reclaimSpaceForMainDb(dbRaw) { let list = readBackupList(); while (true) { try { localStorage.setItem(DB_KEY, dbRaw); return true } catch { if (!list.length) break; list.shift(); try { persistBackupList(compactBackupList(list)) } catch { break } } } return false }
        async function saveDb(db, reason = 'atualização') {
            const safeDb = normalizeDbShape(db);
            safeDb.meta = safeDb.meta || {};
            safeDb.meta.updatedAt = new Date().toISOString();
            const raw = JSON.stringify(safeDb);
            mainDbCache = normalizeDbShape(safeDb);
            let mainSaved = false;
            if (primaryStorageMode === 'indexedDB') {
                const indexedSaved = await queueMainDbIndexedSave(mainDbCache);
                // Keep a best-effort mirror for compatibility/fallback.
                const localMirrorSaved = persistMainDbLocal(raw);
                mainSaved = indexedSaved || localMirrorSaved;
            } else {
                const localSaved = persistMainDbLocal(raw);
                if (localSaved) {
                    mainSaved = true;
                    void queueMainDbIndexedSave(mainDbCache);
                } else {
                    mainSaved = await queueMainDbIndexedSave(mainDbCache);
                }
            }
            const backupSaved = mainSaved ? saveBackupsSnapshot(safeDb, reason) : false;
            return { mainSaved, backupSaved };
        }
        async function clearMainDbStorage(nextDb = null) {
            mainDbCache = normalizeDbShape(nextDb || initialDb());
            let clearedLocal = true;
            try {
                localStorage.removeItem(DB_KEY);
            } catch {
                clearedLocal = false;
            }
            let clearedIndexed = await deleteStoredValue(FS_MAIN_DB_KEY);
            if (!clearedIndexed) clearedIndexed = await writeStoredHandle(FS_MAIN_DB_KEY, mainDbCache);
            if (!clearedIndexed) {
                indexedDbCapable = false;
                primaryStorageMode = 'localStorage';
            } else {
                indexedDbCapable = true;
                primaryStorageMode = 'indexedDB';
            }
            return { clearedLocal, clearedIndexed };
        }
        function applySaveStatus(result, okMsg) { const prefix = okMsg ? `${okMsg} ` : ''; if (!result.mainSaved) { UiModule.setStatus('Falha ao salvar na base local. Verifique permissões e espaço disponível no navegador.', 'bad'); return false } if (!result.backupSaved) { UiModule.setStatus(`${prefix}Dados salvos, mas o snapshot automático falhou.`, 'warn'); return true } UiModule.setStatus(`${prefix}Backup automático criado.`, 'ok'); return true }
        function setStatus(msg, type = 'default') { const m = { default: '#9fb0d1', ok: '#22c55e', warn: '#facc15', bad: '#f87171', info: '#67e8f9' }; els.statusBox.textContent = msg; els.statusBox.style.color = m[type] || m.default }
        function ensureMonthSelected() { const m = els.monthRef.value; if (!m) { UiModule.setStatus('Selecione o mês de referência.', 'warn'); return null } return m }
        function currentMonthValue() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
        function shiftMonth(monthStr, delta) { const m = String(monthStr || '').match(/^(\d{4})-(\d{2})$/), d = m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : new Date(); d.setMonth(d.getMonth() + delta); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
        function formatMonthPtBr(monthStr) { const m = String(monthStr || '').match(/^(\d{4})-(\d{2})$/); if (!m) return monthStr || '-'; const d = new Date(Number(m[1]), Number(m[2]) - 1, 1); return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
        function setReferenceMonth(month, msg = '') { if (!month) return; els.monthRef.value = month; ManualModule.resetManualForm(); UiModule.renderAll(); if (msg) UiModule.setStatus(msg, 'info') }
        function setDefaultMonth() { if (!els.monthRef.value) els.monthRef.value = currentMonthValue() }
        function updateMonthRefInfo() { const m = els.monthRef.value || ''; els.monthRefInfo.textContent = m ? `Selecionado: ${formatMonthPtBr(m)} (${m})` : 'Nenhum mês selecionado.' }
        function collectSubjectSuggestions() {
            const db = StorageAdapter.loadDb(), unique = new Map(), add = (value) => {
                const subject = normalizeSubjectPattern(value);
                if (!subject) return;
                const key = normalizeText(subject).toLowerCase();
                if (!key || unique.has(key)) return;
                unique.set(key, subject);
            };
            DEFAULT_SUBJECTS.forEach(add);
            Object.values(db.months || {}).forEach(pack => {
                (pack?.manual || []).forEach(row => add(row.assunto));
                (pack?.system || []).forEach(row => add(row.assunto));
            });
            return [...unique.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        }
        function collectEmployeeSuggestions() {
            const db = StorageAdapter.loadDb(), unique = new Map(), add = (value) => {
                const employee = normalizeEmployeeName(value);
                if (!employee) return;
                const key = normalizeText(employee).toLowerCase();
                if (!key || unique.has(key)) return;
                unique.set(key, employee);
            };
            DEFAULT_EMPLOYEES.forEach(add);
            Object.values(db.months || {}).forEach(pack => {
                (pack?.manual || []).forEach(row => add(row.colaborador));
                (pack?.system || []).forEach(row => add(row.colaborador));
            });
            const sorted = [...unique.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
            if (sorted.length <= MAX_EMPLOYEE_SUGGESTIONS) return sorted;
            const fixedKeySet = new Set(DEFAULT_EMPLOYEES.map(name => normalizeText(name).toLowerCase()));
            const fixed = sorted.filter(name => fixedKeySet.has(normalizeText(name).toLowerCase()));
            const others = sorted.filter(name => !fixedKeySet.has(normalizeText(name).toLowerCase()));
            return [...fixed, ...others].slice(0, MAX_EMPLOYEE_SUGGESTIONS);
        }
        function renderSubjectSuggestions() {
            if (!els.subjectSuggestions) return;
            els.subjectSuggestions.innerHTML = SubjectCatalog.getAll().map(subject => `<option value="${escapeHtml(subject)}"></option>`).join('');
        }
        function renderEmployeeSuggestions() {
            if (!els.employeeSuggestions) return;
            els.employeeSuggestions.innerHTML = collectEmployeeSuggestions().map(employee => `<option value="${escapeHtml(employee)}"></option>`).join('');
        }
        function validTabName(tab) { return ['auditoria', 'historico', 'dashboard'].includes(String(tab || '')) }
        function storedTabName() { try { const raw = localStorage.getItem(TAB_KEY) || ''; return validTabName(raw) ? raw : 'auditoria' } catch { return 'auditoria' } }
        function setActiveTab(tabName, persist = true) {
            const nextTab = validTabName(tabName) ? tabName : 'auditoria';
            currentTab = nextTab;
            const tabs = [
                { name: 'auditoria', btn: els.tabBtnAuditoria, panel: els.tabPanelAuditoria },
                { name: 'historico', btn: els.tabBtnHistorico, panel: els.tabPanelHistorico },
                { name: 'dashboard', btn: els.tabBtnDashboard, panel: els.tabPanelDashboard }
            ];
            tabs.forEach(item => {
                const active = item.name === nextTab;
                item.btn.classList.toggle('active', active);
                item.btn.setAttribute('aria-selected', active ? 'true' : 'false');
                item.btn.tabIndex = active ? 0 : -1;
                item.panel.hidden = !active;
                item.panel.classList.toggle('hidden', !active);
            });
            if (!persist) return;
            try { localStorage.setItem(TAB_KEY, nextTab) } catch { }
        }
        function initTabs() {
            setActiveTab(storedTabName(), false);
            const buttons = [
                { name: 'auditoria', btn: els.tabBtnAuditoria },
                { name: 'historico', btn: els.tabBtnHistorico },
                { name: 'dashboard', btn: els.tabBtnDashboard }
            ];
            buttons.forEach(item => item.btn.addEventListener('click', () => setActiveTab(item.name)));
            els.tabNav.addEventListener('keydown', e => {
                const order = ['auditoria', 'historico', 'dashboard'];
                const idx = order.indexOf(currentTab);
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % order.length : (idx - 1 + order.length) % order.length;
                setActiveTab(order[nextIdx]);
                buttons[nextIdx].btn.focus();
            });
        }
        function ensureMonthPack(db, month) { db.months[month] = db.months[month] || { manual: [], system: [], imports: {} }; return db.months[month] }
        function normalizeText(v) { return String(v ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ') }
        function employeeNameKey(value) { return normalizeText(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() }
        function employeeNameTokens(value) { return employeeNameKey(value).split(' ').filter(token => token && !EMPLOYEE_TOKEN_IGNORES.has(token)) }
        function canonicalEmployeeMatch(value) {
            const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
            if (!raw) return '';
            const rawKey = employeeNameKey(raw);
            if (!rawKey) return raw;
            let best = null;
            const rawTokens = employeeNameTokens(raw);
            const rawTokenSet = new Set(rawTokens);
            DEFAULT_EMPLOYEES.forEach(candidate => {
                const candidateKey = employeeNameKey(candidate);
                if (!candidateKey) return;
                if (rawKey === candidateKey) {
                    best = { name: candidate, score: 1 };
                    return;
                }
                const candidateTokens = employeeNameTokens(candidate);
                if (!candidateTokens.length || !rawTokens.length) return;
                let common = 0;
                candidateTokens.forEach(token => { if (rawTokenSet.has(token)) common++; });
                const ratio = common / Math.max(rawTokens.length, candidateTokens.length);
                let score = ratio;
                if (rawKey.includes(candidateKey) || candidateKey.includes(rawKey)) score = Math.max(score, 0.9);
                if (common >= 2 && ratio >= 0.5) score = Math.max(score, 0.8);
                if (common >= 3 && ratio >= 0.6) score = Math.max(score, 0.9);
                if (!best || score > best.score) best = { name: candidate, score };
            });
            return best && best.score >= 0.8 ? best.name : raw;
        }
        function normalizeEmployeeName(value) { return canonicalEmployeeMatch(value) }
        function normalizeSubjectPattern(v) { const clean = String(v ?? '').trim().replace(/\s+/g, ' '); return clean ? clean.toLocaleUpperCase('pt-BR') : '' }
        function escapeHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') }
        function closeModal(result = null) {
            if (!activeModalResolver) return;
            const resolver = activeModalResolver;
            activeModalResolver = null;
            els.modalOverlay.hidden = true;
            els.modalOverlay.classList.add('hidden');
            els.modalActions.innerHTML = '';
            resolver(result);
        }
        function openModal({ title, message, buttons }) {
            if (activeModalResolver) closeModal(null);
            els.modalTitle.textContent = String(title ?? '');
            els.modalMessage.innerHTML = String(message ?? '').split('\n').map(part => escapeHtml(part)).join('<br>');
            els.modalActions.innerHTML = '';
            return new Promise(resolve => {
                activeModalResolver = resolve;
                buttons.forEach((btnCfg, idx) => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.textContent = btnCfg.label;
                    if (btnCfg.className) b.className = btnCfg.className;
                    b.addEventListener('click', () => closeModal(btnCfg.value));
                    els.modalActions.appendChild(b);
                    if (idx === 0) requestAnimationFrame(() => b.focus());
                });
                els.modalOverlay.hidden = false;
                els.modalOverlay.classList.remove('hidden');
            });
        }
        const ModalService = {
            async confirm({ title = 'Confirmar ação', message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', confirmClass = 'good' }) {
                const result = await openModal({
                    title,
                    message,
                    buttons: [
                        { label: cancelLabel, value: false, className: 'secondary' },
                        { label: confirmLabel, value: true, className: confirmClass }
                    ]
                });
                return result === true;
            },
            async promptChoice({ title = 'Escolha uma opção', message = '', choices = [] }) {
                const buttons = choices.map(c => ({ label: c.label, value: c.value, className: c.className || 'secondary' }));
                buttons.push({ label: 'Cancelar', value: null, className: 'secondary' });
                return openModal({ title, message, buttons });
            },
            async alert({ title = 'Aviso', message = '', okLabel = 'OK' }) {
                await openModal({ title, message, buttons: [{ label: okLabel, value: true, className: 'good' }] });
            }
        };
        function initModalService() {
            els.modalOverlay.addEventListener('click', e => { if (e.target === els.modalOverlay) closeModal(null) });
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && activeModalResolver) closeModal(null) });
        }
        const SubjectCatalog = {
            getAll() { return collectSubjectSuggestions() },
            normalize(value) { return normalizeSubjectPattern(value) },
            isAllowed(value) {
                const key = normalizeText(this.normalize(value)).toLowerCase();
                if (!key) return false;
                return this.getAll().some(subject => normalizeText(subject).toLowerCase() === key);
            }
        };
        const StorageAdapter = {
            loadDb() { return loadDb() },
            saveDb(db, reason) { return saveDb(db, reason) },
            saveSnapshot(db, reason) { return saveBackupsSnapshot(db, reason) },
            restoreLastSnapshot() { return restoreLastBackup() },
            async initialize() { await bootstrapStorageAdapter() },
            async clearDb(nextDb = null) { return clearMainDbStorage(nextDb) },
            mode() { return primaryStorageMode }
        };
        function normalizeHeader(h) { return normalizeText(h).toLowerCase() }
        function isValidIsoDate(dateStr) {
            const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) return false;
            const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
            if (month < 1 || month > 12) return false;
            const maxDay = new Date(year, month, 0).getDate();
            return day >= 1 && day <= maxDay;
        }
        function normalizeDateValue(value) {
            if (value === null || value === undefined || value === '') return '';
            if (typeof value === 'number' && window.XLSX && XLSX.SSF) {
                try {
                    const d = XLSX.SSF.parse_date_code(value);
                    if (d && d.y && d.m && d.d) {
                        const isoFromNumber = `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
                        if (isValidIsoDate(isoFromNumber)) return isoFromNumber;
                    }
                } catch { }
            }
            const raw = String(value).trim();
            const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T].*)?$/);
            if (br) {
                const y = br[3].length === 2 ? `20${br[3]}` : br[3];
                const isoFromBr = `${y}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
                return isValidIsoDate(isoFromBr) ? isoFromBr : raw;
            }
            const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
            if (iso) {
                const isoNormalized = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
                return isValidIsoDate(isoNormalized) ? isoNormalized : raw;
            }
            const isoSlash = raw.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})(?:[ T].*)?$/);
            if (isoSlash) {
                const isoNormalized = `${isoSlash[1]}-${isoSlash[2].padStart(2, '0')}-${isoSlash[3].padStart(2, '0')}`;
                return isValidIsoDate(isoNormalized) ? isoNormalized : raw;
            }
            const trimmedDatePart = raw.match(/^(\d{4}-\d{1,2}-\d{1,2})T/);
            if (trimmedDatePart) {
                const isoDateOnly = normalizeDateValue(trimmedDatePart[1]);
                if (isValidIsoDate(isoDateOnly)) return isoDateOnly;
            }
            return raw;
        }
        function formatDateBr(value, emptyValue = '-') { const iso = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`; const br = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (br) return `${br[1]}/${br[2]}/${br[3]}`; const raw = String(value ?? '').trim(); return raw || emptyValue }
        function monthFromIsoDate(dateStr) {
            if (!isValidIsoDate(dateStr)) return '';
            return String(dateStr).slice(0, 7);
        }
        async function chooseManualSaveMonth(refMonth, dataAbertura) {
            const dateMonth = monthFromIsoDate(dataAbertura);
            if (!dateMonth || dateMonth === refMonth) return { month: refMonth, moved: false };
            const choice = await ModalService.promptChoice({
                title: 'Definir mês de salvamento',
                message: `A data de abertura (${dataAbertura}) pertence a ${dateMonth}, mas o mês selecionado é ${refMonth}.`,
                choices: [
                    { label: `Salvar em ${dateMonth}`, value: '2', className: 'good' },
                    { label: `Salvar em ${refMonth}`, value: '1', className: 'secondary' }
                ]
            });
            if (choice === null) { UiModule.setStatus('Salvamento cancelado.', 'warn'); return null }
            if (choice === '1') return { month: refMonth, moved: false };
            if (choice === '2') return { month: dateMonth, moved: true };
            UiModule.setStatus('Opção inválida para definir o mês de salvamento.', 'warn');
            return null;
        }
        function sortManualRows(rows) { rows.sort((a, b) => String(a.ID).localeCompare(String(b.ID), 'pt-BR', { numeric: true })); return rows }
        function getPreviousMonth(monthStr) { if (!monthStr) return ''; const [y, m] = monthStr.split('-').map(Number); const d = new Date(y, m - 1, 1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
        function csvMaybeBroken(text) { return /�/.test(text) }
        function decodeWindows1252(buf) { try { return new TextDecoder('windows-1252').decode(buf) } catch { return new TextDecoder('iso-8859-1').decode(buf) } }
        function readArrayBuffer(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Falha ao ler o arquivo.')); r.readAsArrayBuffer(file) }) }
        function readTextFile(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result ?? '')); r.onerror = () => reject(new Error('Falha ao ler o arquivo JSON.')); r.readAsText(file, 'utf-8') }) }
        function parseCsvText(text) { const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean); if (!lines.length) return []; const delimiter = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ','; function parseLine(line) { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q } else if (ch === delimiter && !q) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out.map(v => v.trim()) } const headers = parseLine(lines[0]), rows = []; for (let i = 1; i < lines.length; i++) { const vals = parseLine(lines[i]); if (!vals.length) continue; const obj = {}; headers.forEach((h, idx) => obj[h] = vals[idx] ?? ''); rows.push(obj) } return rows }
        async function parseSpreadsheet(file) { const ext = (file.name.split('.').pop() || '').toLowerCase(); if (ext === 'csv') { const buf = await readArrayBuffer(file); let text = new TextDecoder('utf-8').decode(buf); if (csvMaybeBroken(text)) text = decodeWindows1252(buf); return parseCsvText(text) } assertSpreadsheetLibraryAvailable(window.XLSX); const buf = await readArrayBuffer(file); const wb = XLSX.read(buf, { type: 'array', cellDates: false }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) }
        function mapRow(row) { const m = {}; Object.entries(row || {}).forEach(([k, v]) => m[normalizeHeader(k)] = v); return { ID: String((m['id'] ?? m['codigo'] ?? m['codigo apr'] ?? m['apr'] ?? '')).trim(), dataAbertura: normalizeDateValue(m['data de abertura'] ?? m['data abertura'] ?? m['abertura'] ?? m['data'] ?? ''), assunto: normalizeSubjectPattern(m['assunto'] ?? m['descricao'] ?? ''), colaborador: normalizeEmployeeName(m['colaborador'] ?? m['funcionario'] ?? m['responsavel'] ?? '') } }
        function normalizeAndValidateRows(rawRows) {
            const rows = [], invalid = [], duplicates = [], idxMap = new Map(), idMonthMap = new Map();
            const invalidByMonth = new Map(), duplicateByMonth = new Map();
            function addInvalidMonth(month) {
                if (!month) return;
                invalidByMonth.set(month, (invalidByMonth.get(month) || 0) + 1);
            }
            function addDuplicateMonth(month, id) {
                if (!month || !id) return;
                if (!duplicateByMonth.has(month)) duplicateByMonth.set(month, new Set());
                duplicateByMonth.get(month).add(id);
            }
            rawRows.forEach((row, idx) => {
                const r = mapRow(row), line = idx + 2, rowMonth = monthFromIsoDate(r.dataAbertura);
                if (!r.ID) {
                    invalid.push(`Linha ${line}: ID ausente`);
                    addInvalidMonth(rowMonth);
                    return;
                }
                if (!isValidIsoDate(r.dataAbertura)) {
                    invalid.push(`Linha ${line}: Data de abertura ausente/inválida`);
                    addInvalidMonth(rowMonth);
                    return;
                }
                if (!r.assunto) {
                    invalid.push(`Linha ${line}: Assunto ausente`);
                    addInvalidMonth(rowMonth);
                    return;
                }
                if (!r.colaborador) {
                    invalid.push(`Linha ${line}: Colaborador ausente`);
                    addInvalidMonth(rowMonth);
                    return;
                }
                if (idxMap.has(r.ID)) {
                    duplicates.push(r.ID);
                    addDuplicateMonth(rowMonth, r.ID);
                    addDuplicateMonth(idMonthMap.get(r.ID) || '', r.ID);
                    rows[idxMap.get(r.ID)] = r;
                    idMonthMap.set(r.ID, rowMonth);
                } else {
                    idxMap.set(r.ID, rows.length);
                    rows.push(r);
                    idMonthMap.set(r.ID, rowMonth);
                }
            });
            return {
                rows,
                invalid,
                duplicates: [...new Set(duplicates)],
                invalidByMonth,
                duplicatesByMonth: duplicateByMonth
            };
        }
        function groupRowsByDateMonth(rows, fallbackMonth) {
            const grouped = new Map();
            (rows || []).forEach(row => {
                const month = fallbackMonth || monthFromIsoDate(row?.dataAbertura || '');
                if (!month) return;
                if (!grouped.has(month)) grouped.set(month, []);
                grouped.get(month).push(row);
            });
            return grouped;
        }
        function monthImportSummary(grouped) { return [...grouped.entries()].map(([month, rows]) => `${month} (${rows.length})`).join(', ') }
        async function importSystemBase() {
            const fallbackMonth = ensureMonthSelected();
            if (!fallbackMonth) return;
            const file = els.systemFile.files[0];
            if (!file) {
                UiModule.setStatus('Selecione a planilha do sistema.', 'warn');
                return;
            }
            try {
                UiModule.setStatus('Lendo planilha do sistema...', 'info');
                const parsed = await parseSpreadsheet(file);
                const res = normalizeAndValidateRows(parsed);
                if (!res.rows.length) {
                    UiModule.setStatus('Nenhum registro válido encontrado na planilha do sistema.', 'bad');
                    return;
                }
                const grouped = groupRowsByDateMonth(res.rows, fallbackMonth);
                if (!grouped.size) {
                    UiModule.setStatus('Não foi possível processar os dados para o mês selecionado.', 'bad');
                    return;
                }
                const db = StorageAdapter.loadDb();
                const importedAt = new Date().toISOString();
                grouped.forEach((rowsByMonth, month) => {
                    const pack = ensureMonthPack(db, month);
                    pack.system = rowsByMonth;
                    pack.imports.system = {
                        fileName: file.name,
                        importedAt,
                        totalValid: rowsByMonth.length,
                        totalInvalid: res.invalid.length,
                        duplicates: res.duplicates.length,
                        totalInvalidGlobal: res.invalid.length,
                        duplicatesGlobal: res.duplicates.length,
                        monthDetectedByDate: false
                    };
                });
                const saveResult = await StorageAdapter.saveDb(db, 'importação da base do sistema');
                if (!saveResult.mainSaved) return applySaveStatus(saveResult, '');
                UiModule.renderAll();
                const extras = [];
                if (res.duplicates.length) extras.push(`${res.duplicates.length} ID(s) duplicado(s)`);
                if (res.invalid.length) extras.push(`${res.invalid.length} linha(s) inválida(s) ignorada(s)`);
                const monthsInfo = monthImportSummary(grouped);
                applySaveStatus(saveResult, `Base do sistema importada no mês de referência selecionado. ${res.rows.length} registro(s). Meses: ${monthsInfo}. ${extras.join('. ')}`.trim());
            } catch (err) {
                UiModule.setStatus(err.message || 'Falha ao importar a base do sistema.', 'bad');
            }
        }
        async function importManualBase() {
            const fallbackMonth = ensureMonthSelected();
            if (!fallbackMonth) return;
            const file = els.manualFile.files[0];
            if (!file) {
                UiModule.setStatus('Selecione a planilha da base manual.', 'warn');
                return;
            }
            try {
                UiModule.setStatus('Lendo planilha da base manual...', 'info');
                const parsed = await parseSpreadsheet(file);
                const res = normalizeAndValidateRows(parsed);
                if (!res.rows.length) {
                    UiModule.setStatus('Nenhum registro válido encontrado na planilha da base manual.', 'bad');
                    return;
                }
                const grouped = groupRowsByDateMonth(res.rows, fallbackMonth);
                if (!grouped.size) {
                    UiModule.setStatus('Não foi possível processar os dados para o mês selecionado.', 'bad');
                    return;
                }
                const db = StorageAdapter.loadDb();
                const importedAt = new Date().toISOString();
                grouped.forEach((rowsByMonth, month) => {
                    const pack = ensureMonthPack(db, month);
                    pack.manual = sortManualRows(rowsByMonth.slice());
                    pack.imports.manual = {
                        fileName: file.name,
                        importedAt,
                        totalValid: rowsByMonth.length,
                        totalInvalid: res.invalid.length,
                        duplicates: res.duplicates.length,
                        totalInvalidGlobal: res.invalid.length,
                        duplicatesGlobal: res.duplicates.length,
                        monthDetectedByDate: false
                    };
                });
                const saveResult = await StorageAdapter.saveDb(db, 'importação da base manual');
                if (!saveResult.mainSaved) return applySaveStatus(saveResult, '');
                UiModule.renderAll();
                const extras = [];
                if (res.duplicates.length) extras.push(`${res.duplicates.length} ID(s) duplicado(s)`);
                if (res.invalid.length) extras.push(`${res.invalid.length} linha(s) inválida(s) ignorada(s)`);
                const monthsInfo = monthImportSummary(grouped);
                applySaveStatus(saveResult, `Base manual importada no mês de referência selecionado. ${res.rows.length} registro(s). Meses: ${monthsInfo}. ${extras.join('. ')}`.trim());
            } catch (err) {
                UiModule.setStatus(err.message || 'Falha ao importar a base manual.', 'bad');
            } finally {
                els.manualFile.value = '';
            }
        }
        function buildMap(rows) { const m = new Map(); (rows || []).forEach(r => m.set(r.ID, r)); return m }
        function compareBases(systemRows, manualRows) { return compareBasesModule(systemRows, manualRows) }
        function compareMonthToPrevious(currentRows, previousRows) { return compareMonthToPreviousModule(currentRows, previousRows) }
        function pill(status) { const cls = { 'Conferido': 'ok', 'Divergente': 'bad', 'So no sistema': 'warn', 'So no manual': 'info', 'Novo': 'ok', 'Removido': 'warn', 'Alterado': 'bad', 'Sem alteracao': 'info' }[status] || 'bad'; return `<span class="pill ${cls}">${escapeHtml(status)}</span>` }
        function renderCards(container, items) { container.innerHTML = items.map(i => `<div class="card"><div class="k">${escapeHtml(i.label)}</div><div class="v ${escapeHtml(i.className || '')}">${escapeHtml(i.value)}</div></div>`).join('') }
        function renderDashboardForMonth(month) {
            const pack = StorageAdapter.loadDb().months[month] || { manual: [], system: [] };
            const manualRows = pack.manual || [], systemRows = pack.system || [];
            const auditSummary = compareBases(systemRows, manualRows).summary;
            const totalDivergentes = auditDivergentCount(auditSummary);
            const statusGeral = totalDivergentes ? 'Divergente' : 'Conferido';
            const cobertura = auditSummary.totalSistema ? `${Math.round((auditSummary.conferido / auditSummary.totalSistema) * 100)}%` : '0%';
            const colaboradores = new Set([...manualRows, ...systemRows].map(r => normalizeText(r.colaborador).toLowerCase()).filter(Boolean)).size;
            renderCards(els.dashboardCards, [
                { label: 'Mes de referencia', value: month || '-' },
                { label: 'Status geral', value: statusGeral, className: statusGeral === 'Conferido' ? 'ok' : 'bad-txt' },
                { label: 'Base manual', value: manualRows.length },
                { label: 'Base sistema', value: systemRows.length },
                { label: 'Divergentes', value: totalDivergentes, className: totalDivergentes ? 'bad-txt' : 'ok' },
                { label: 'Cobertura da auditoria', value: cobertura, className: 'info-txt' },
                { label: 'Colaboradores unicos', value: colaboradores }
            ]);
        }
        function renderMonths() { const db = StorageAdapter.loadDb(), months = Object.keys(db.months).sort(), active = els.monthRef.value || ''; els.monthsList.innerHTML = months.length ? months.map(m => { const p = db.months[m] || {}; return `<button type="button" class="chip ${m === active ? 'active' : ''}" data-month="${m}" title="Selecionar ${m}">${m} • Manual: ${(p.manual || []).length} • Sistema: ${(p.system || []).length}</button>` }).join('') : '<span class="chip">Nenhum mês armazenado</span>' }
        function backupSummary() { const list = readBackupList(); if (!list.length) return { count: 0, latestLabel: 'Sem snapshot' }; return { count: list.length, latestLabel: `${list.length} snapshots` } }
        function resetManualForm() { currentEditId = null; els.manualId.value = ''; els.manualDate.value = ''; els.manualSubject.value = ''; els.manualEmployee.value = ''; els.manualEditInfo.textContent = 'Novo lançamento.' }
        function handleManualEnterSave(e) { if (e.key !== 'Enter') return; if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return; e.preventDefault(); saveManualEntry() }
        async function saveManualEntry() {
            const month = ensureMonthSelected();
            if (!month) return;
            const id = els.manualId.value.trim(), dataAbertura = normalizeDateValue(els.manualDate.value), assunto = SubjectCatalog.normalize(els.manualSubject.value), colaborador = normalizeEmployeeName(els.manualEmployee.value);
            if (!id || !dataAbertura || !assunto || !colaborador) {
                UiModule.setStatus('Preencha ID, Data de abertura, Assunto e Colaborador.', 'warn');
                return;
            }
            const targetChoice = await chooseManualSaveMonth(month, dataAbertura);
            if (!targetChoice) return;
            const targetMonth = targetChoice.month, db = StorageAdapter.loadDb(), sourcePack = ensureMonthPack(db, month), targetPack = ensureMonthPack(db, targetMonth), targetRows = targetPack.manual || [], record = { ID: id, dataAbertura, assunto, colaborador };
            let saveResult = null, statusMsg = '';
            if (currentEditId) {
                if (targetMonth !== month) {
                    if (targetRows.find(r => r.ID === id)) {
                        UiModule.setStatus('Já existe um lançamento manual com esse ID no mês de destino.', 'bad');
                        return;
                    }
                    const sourceRows = sourcePack.manual || [], sourceIdx = sourceRows.findIndex(r => r.ID === currentEditId);
                    if (sourceIdx < 0) {
                        UiModule.setStatus('Registro em edição não encontrado no mês de origem.', 'bad');
                        return;
                    }
                    sourceRows.splice(sourceIdx, 1);
                    targetRows.push(record);
                    sortManualRows(targetRows);
                    saveResult = await StorageAdapter.saveDb(db, 'edição de lançamento manual');
                    statusMsg = `Lançamento ${id} movido para ${targetMonth}.`;
                } else {
                    if (currentEditId !== id && targetRows.find(r => r.ID === id)) {
                        UiModule.setStatus('Já existe um lançamento manual com esse ID.', 'bad');
                        return;
                    }
                    const idx = targetRows.findIndex(r => r.ID === currentEditId);
                    if (idx >= 0) targetRows[idx] = record; else targetRows.push(record);
                    sortManualRows(targetRows);
                    saveResult = await StorageAdapter.saveDb(db, 'edição de lançamento manual');
                    statusMsg = `Lançamento ${id} atualizado.`;
                }
            } else {
                if (targetRows.find(r => r.ID === id)) {
                    UiModule.setStatus('Já existe um lançamento manual com esse ID. Edite o registro existente.', 'bad');
                    return;
                }
                targetRows.push(record);
                sortManualRows(targetRows);
                saveResult = await StorageAdapter.saveDb(db, 'novo lançamento manual');
                statusMsg = `Lançamento ${id} salvo em ${targetMonth}.`;
            }
            if (!applySaveStatus(saveResult, statusMsg)) return;
            if (targetChoice.moved && els.monthRef.value !== targetMonth) els.monthRef.value = targetMonth;
            ManualModule.resetManualForm();
            UiModule.renderAll();
        }
        function editManualEntry(id) { const month = ensureMonthSelected(); if (!month) return; const row = ((StorageAdapter.loadDb().months[month] || { manual: [] }).manual || []).find(r => r.ID === id); if (!row) { UiModule.setStatus('Registro manual não encontrado.', 'warn'); return } currentEditId = row.ID; els.manualId.value = row.ID; els.manualDate.value = row.dataAbertura || ''; els.manualSubject.value = normalizeSubjectPattern(row.assunto || ''); els.manualEmployee.value = row.colaborador || ''; els.manualEditInfo.textContent = `Editando ID ${row.ID}.`; UiModule.setStatus(`Editando o lançamento ${row.ID}.`, 'info') }
        async function deleteManualEntry(id) {
            const month = ensureMonthSelected();
            if (!month) return;
            if (!(await ModalService.confirm({ title: 'Excluir lançamento', message: `Deseja excluir o lançamento manual ${id}?`, confirmLabel: 'Excluir', confirmClass: 'bad' }))) return;
            const db = StorageAdapter.loadDb();
            const pack = db.months[month] || { manual: [] };
            pack.manual = (pack.manual || []).filter(r => r.ID !== id);
            const saveResult = await StorageAdapter.saveDb(db, 'exclusão de lançamento manual');
            if (!applySaveStatus(saveResult, `Lançamento ${id} excluído.`)) return;
            if (currentEditId === id) ManualModule.resetManualForm();
            UiModule.renderAll();
        }
        function renderManualForMonth(month) { const pack = (StorageAdapter.loadDb().months[month] || { manual: [] }), rows = (pack.manual || []).slice().sort((a, b) => String(a.ID).localeCompare(String(b.ID), 'pt-BR', { numeric: true })), emp = new Set(rows.map(r => normalizeText(r.colaborador).toLowerCase()).filter(Boolean)).size, bk = backupSummary(); renderCards(els.manualCards, [{ label: 'Lançamentos manuais', value: rows.length }, { label: 'Colaboradores', value: emp }, { label: 'Mês', value: month || '-' }, { label: 'Último backup', value: bk.latestLabel }]); if (!rows.length) { els.manualTableArea.innerHTML = '<div class="empty">Nenhum lançamento manual neste mês.</div>'; return } const body = rows.map(r => { const safeId = encodeURIComponent(String(r.ID)); return `<tr><td>${escapeHtml(r.ID)}</td><td>${escapeHtml(formatDateBr(r.dataAbertura || '-'))}</td><td>${escapeHtml(normalizeSubjectPattern(r.assunto || '-'))}</td><td>${escapeHtml(r.colaborador || '-')}</td><td><div class="btns"><button type="button" class="secondary js-edit-manual" data-id="${safeId}">Editar</button><button type="button" class="bad js-delete-manual" data-id="${safeId}">Excluir</button></div></td></tr>` }).join(''); els.manualTableArea.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Data de abertura</th><th>Assunto</th><th>Colaborador</th><th>Ações</th></tr></thead><tbody>${body}</tbody></table></div>` }
        function renderAuditForMonth(month) {
            const pack = StorageAdapter.loadDb().months[month] || { manual: [], system: [] }, result = compareBases(pack.system || [], pack.manual || []), statusGeral = auditDivergentCount(result.summary) ? 'Divergente' : 'Conferido';
            renderCards(els.auditCards, [{ label: 'Status geral', value: statusGeral, className: statusGeral === 'Conferido' ? 'ok' : 'bad-txt' }, { label: 'Total sistema', value: result.summary.totalSistema }, { label: 'Total manual', value: result.summary.totalManual }, { label: 'Conferido', value: result.summary.conferido, className: 'ok' }, { label: 'Divergente', value: result.summary.divergente || 0, className: 'bad-txt' }, { label: 'So no sistema', value: result.summary.soSistema, className: 'warn-txt' }, { label: 'So no manual', value: result.summary.soManual, className: 'info-txt' }, { label: 'Divergentes', value: auditDivergentCount(result.summary), className: 'bad-txt' }]);
            let details = result.details.slice();
            if (auditFilterMode === 'missing') details = details.filter(i => i.status !== 'Conferido');
            const q = normalizeText(els.searchAudit.value).toLowerCase();
            const collaboratorFilter = normalizeText(els.filterAuditEmployee?.value).toLowerCase();
            const subjectFilter = normalizeText(els.filterAuditSubject?.value).toLowerCase();
            const dateFilter = normalizeDateValue(els.filterAuditDate?.value || '');
            if (q) details = details.filter(i => [i.ID, i.system?.assunto, i.manual?.assunto, i.system?.colaborador, i.manual?.colaborador].map(v => normalizeText(v).toLowerCase()).join(' | ').includes(q));
            if (collaboratorFilter) details = details.filter(i => [i.system?.colaborador, i.manual?.colaborador].some(v => normalizeText(v).toLowerCase().includes(collaboratorFilter)));
            if (subjectFilter) details = details.filter(i => [i.system?.assunto, i.manual?.assunto].some(v => normalizeText(v).toLowerCase().includes(subjectFilter)));
            if (dateFilter) details = details.filter(i => [i.system?.dataAbertura, i.manual?.dataAbertura].some(v => normalizeDateValue(v) === dateFilter));
            if (!details.length) { els.auditTableArea.innerHTML = '<div class="empty">Nenhum registro para o filtro atual.</div>'; return }
            const body = details.map(i => `<tr class="${i.status === 'Conferido' ? 'row-ok' : 'row-missing'}"><td>${escapeHtml(i.ID)}</td><td>${pill(i.status)}</td><td>${i.changed.length ? escapeHtml(i.changed.join(', ')) : '-'}</td><td>${escapeHtml(formatDateBr(i.system?.dataAbertura || '-'))}</td><td>${escapeHtml(formatDateBr(i.manual?.dataAbertura || '-'))}</td><td>${escapeHtml(normalizeSubjectPattern(i.system?.assunto || '-'))}</td><td>${escapeHtml(normalizeSubjectPattern(i.manual?.assunto || '-'))}</td><td>${escapeHtml(i.system?.colaborador || '-')}</td><td>${escapeHtml(i.manual?.colaborador || '-')}</td></tr>`).join('');
            els.auditTableArea.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Diferencas de dados</th><th>Data sistema</th><th>Data manual</th><th>Assunto sistema</th><th>Assunto manual</th><th>Colaborador sistema</th><th>Colaborador manual</th></tr></thead><tbody>${body}</tbody></table></div>`;
        }
        function renderHistoryForMonth(month, source) {
            const db = StorageAdapter.loadDb(), prev = getPreviousMonth(month), curRows = (db.months[month] || {})[source] || [], prevRows = (db.months[prev] || {})[source] || [], res = compareMonthToPrevious(curRows, prevRows);
            renderCards(els.historyCards, [
                { label: 'Base', value: source === 'manual' ? 'manual' : 'sistema' },
                { label: 'Atual', value: `${month || '-'} (${res.summary.totalAtual})` },
                { label: 'Anterior', value: `${prev || '-'} (${res.summary.totalAnterior})` },
                { label: 'Novo', value: res.summary.novo, className: 'ok' },
                { label: 'Removido', value: res.summary.removido || 0, className: 'warn-txt' },
                { label: 'Alterado', value: res.summary.alterado, className: 'bad-txt' },
                { label: 'Sem alteracao', value: res.summary.semAlteracao, className: 'info-txt' }
            ]);
            if (!res.details.length) {
                els.historyTableArea.innerHTML = '<div class="empty">Sem registros para comparacao historica.</div>';
                return;
            }
            const body = res.details.map(i => `<tr><td>${escapeHtml(i.ID)}</td><td>${pill(i.status)}</td><td>${i.changed.length ? escapeHtml(i.changed.join(', ')) : '-'}</td><td>${escapeHtml(formatDateBr(i.previous?.dataAbertura || '-'))}</td><td>${escapeHtml(formatDateBr(i.current?.dataAbertura || '-'))}</td><td>${escapeHtml(normalizeSubjectPattern(i.previous?.assunto || '-'))}</td><td>${escapeHtml(normalizeSubjectPattern(i.current?.assunto || '-'))}</td><td>${escapeHtml(i.previous?.colaborador || '-')}</td><td>${escapeHtml(i.current?.colaborador || '-')}</td></tr>`).join('');
            els.historyTableArea.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Campos alterados</th><th>Data anterior</th><th>Data atual</th><th>Assunto anterior</th><th>Assunto atual</th><th>Colaborador anterior</th><th>Colaborador atual</th></tr></thead><tbody>${body}</tbody></table></div>`;
        }
        function exportCsv(filename, header, rows) { const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`, lines = [header.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))], csv = '\uFEFF' + lines.join('\n'), blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) }
        function hasFileSystemAccess() { return typeof window.showDirectoryPicker === 'function' }
        async function resolveBackupFileHandle() {
            if (!hasFileSystemAccess()) return null;
            if (!backupDirectoryHandle) backupDirectoryHandle = await readStoredHandle(FS_BACKUP_DIR_KEY);
            if (backupDirectoryHandle && typeof backupDirectoryHandle.queryPermission === 'function') {
                const permission = await backupDirectoryHandle.queryPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    const requested = await backupDirectoryHandle.requestPermission({ mode: 'readwrite' });
                    if (requested !== 'granted') backupDirectoryHandle = null;
                }
            }
            if (!backupDirectoryHandle) {
                UiModule.setStatus('Selecione a pasta onde está o HTML para fixar o backup JSON.', 'info');
                backupDirectoryHandle = await window.showDirectoryPicker({ id: 'apr-control-backup-dir', mode: 'readwrite' });
                await writeStoredHandle(FS_BACKUP_DIR_KEY, backupDirectoryHandle);
            }
            return backupDirectoryHandle.getFileHandle(FIXED_BACKUP_FILE, { create: true });
        }
        function exportMissingCsv() { const month = ensureMonthSelected(); if (!month) return; const pack = StorageAdapter.loadDb().months[month] || { manual: [], system: [] }, missing = compareBases(pack.system || [], pack.manual || []).details.filter(i => i.status !== 'Conferido'); if (!missing.length) { UiModule.setStatus('Não há IDs divergentes para exportar.', 'warn'); return } exportCsv(`apr_divergentes_${month}.csv`, ['ID', 'Status', 'Data Sistema', 'Data Manual', 'Assunto Sistema', 'Assunto Manual', 'Colaborador Sistema', 'Colaborador Manual'], missing.map(i => [i.ID, i.status, formatDateBr(i.system?.dataAbertura || '', ''), formatDateBr(i.manual?.dataAbertura || '', ''), normalizeSubjectPattern(i.system?.assunto || ''), normalizeSubjectPattern(i.manual?.assunto || ''), i.system?.colaborador || '', i.manual?.colaborador || ''])); UiModule.setStatus(`CSV de divergentes exportado para ${month}.`, 'ok') }
        function exportManualCsv() { const month = ensureMonthSelected(); if (!month) return; const rows = ((StorageAdapter.loadDb().months[month] || {}).manual || []); if (!rows.length) { UiModule.setStatus('Não há lançamentos manuais para exportar.', 'warn'); return } exportCsv(`apr_manual_${month}.csv`, ['ID', 'Data de abertura', 'Assunto', 'Colaborador'], rows.map(r => [r.ID, formatDateBr(r.dataAbertura, ''), normalizeSubjectPattern(r.assunto), r.colaborador])); UiModule.setStatus(`Base manual exportada para ${month}.`, 'ok') }
        async function exportJson() {
            const db = StorageAdapter.loadDb(), jsonText = JSON.stringify(db, null, 2);
            if (hasFileSystemAccess()) {
                try {
                    const fileHandle = await resolveBackupFileHandle();
                    const writable = await fileHandle.createWritable();
                    await writable.write(jsonText);
                    await writable.close();
                    UiModule.setStatus(`Backup JSON salvo em ${FIXED_BACKUP_FILE}, substituindo o arquivo anterior.`, 'ok');
                    return;
                } catch (err) {
                    if (err?.name === 'AbortError') { UiModule.setStatus('Exportação de backup cancelada.', 'warn'); return }
                    UiModule.setStatus('Falha ao salvar no arquivo fixo. Usando exportação padrão do navegador.', 'warn');
                }
            }
            const blob = new Blob([jsonText], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url;
            a.download = FIXED_BACKUP_FILE;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            UiModule.setStatus(`Backup JSON exportado como ${FIXED_BACKUP_FILE}.`, 'ok');
        }
        async function importJsonBackup() {
            const file = els.backupJsonFile.files[0];
            if (!file) {
                UiModule.setStatus('Selecione um arquivo de backup JSON.', 'warn');
                return;
            }
            if (!(await ModalService.confirm({ title: 'Importar backup JSON', message: 'Importar backup JSON substituirá a base atual. Deseja continuar?', confirmLabel: 'Importar', confirmClass: 'warn' }))) {
                els.backupJsonFile.value = '';
                return;
            }
            try {
                UiModule.setStatus('Lendo backup JSON...', 'info');
                const text = await readTextFile(file);
                const importedDb = parseDbString(text);
                if (!importedDb) {
                    UiModule.setStatus('Arquivo JSON inválido para restauração.', 'bad');
                    return;
                }
                const currentDb = StorageAdapter.loadDb();
                const beforeOk = StorageAdapter.saveSnapshot(currentDb, 'snapshot antes de importação JSON');
                const saveResult = await StorageAdapter.saveDb(importedDb, 'importação via backup JSON');
                if (!saveResult.mainSaved) {
                    UiModule.setStatus('Falha ao importar backup JSON na base local.', 'bad');
                    return;
                }
                ManualModule.resetManualForm();
                UiModule.renderAll();
                if (!beforeOk || !saveResult.backupSaved) {
                    UiModule.setStatus(`Backup JSON importado (${file.name}). Atenção: houve falha ao criar snapshot automático durante a operação.`, 'warn');
                    return;
                }
                UiModule.setStatus(`Backup JSON importado com sucesso (${file.name}).`, 'ok');
            } catch (err) {
                UiModule.setStatus(err.message || 'Falha ao importar backup JSON.', 'bad');
            } finally {
                els.backupJsonFile.value = '';
            }
        }
        async function restoreLastBackup() {
            try {
                const rawList = safeParseJson(localStorage.getItem(BACKUP_KEY) || '[]', []);
                if (!Array.isArray(rawList) || !rawList.length) {
                    UiModule.setStatus('Nenhum backup automático disponível.', 'warn');
                    return;
                }
                let selected = null;
                let discarded = 0;
                for (let i = rawList.length - 1; i >= 0; i--) {
                    const normalized = normalizeSnapshotEnvelope(rawList[i]);
                    if (normalized) {
                        selected = normalized;
                        break;
                    }
                    discarded++;
                }
                if (!selected) {
                    UiModule.setStatus('Nenhum snapshot íntegro disponível para restauração.', 'bad');
                    return;
                }
                const db = parseDbString(selected.data);
                if (!db) {
                    UiModule.setStatus('Snapshot selecionado está inválido. Restauração cancelada.', 'bad');
                    return;
                }
                const saveResult = await StorageAdapter.saveDb(db, 'restauração de snapshot');
                if (!saveResult.mainSaved) {
                    UiModule.setStatus('Falha ao restaurar backup na base local.', 'bad');
                    return;
                }
                try {
                    persistBackupList(compactBackupList(readBackupList()));
                } catch { }
                UiModule.renderAll();
                ManualModule.resetManualForm();
                if (discarded && !saveResult.backupSaved) {
                    UiModule.setStatus(`Backup restaurado com sucesso (${discarded} snapshot(s) inválido(s) ignorado(s)). Atenção: houve falha ao criar snapshot automático após a restauração.`, 'warn');
                    return;
                }
                if (discarded) {
                    UiModule.setStatus(`Backup restaurado com snapshot anterior válido (${discarded} snapshot(s) inválido(s) ignorado(s)).`, 'warn');
                    return;
                }
                if (!saveResult.backupSaved) {
                    UiModule.setStatus('Backup restaurado, mas houve falha ao criar snapshot automático após a restauração.', 'warn');
                    return;
                }
                UiModule.setStatus(`Último backup restaurado (${new Date(selected.at).toLocaleString('pt-BR')}).`, 'ok');
            } catch {
                UiModule.setStatus('Falha ao restaurar o último backup.', 'bad');
            }
        }
        async function clearMonth() {
            const month = ensureMonthSelected();
            if (!month) return;
            const db = StorageAdapter.loadDb();
            if (!db.months[month]) {
                UiModule.setStatus('Não há dados nesse mês.', 'warn');
                return;
            }
            if (!(await ModalService.confirm({ title: 'Limpar mês', message: `Remover todos os dados de ${month}?`, confirmLabel: 'Remover', confirmClass: 'warn' }))) return;
            delete db.months[month];
            const saveResult = await StorageAdapter.saveDb(db, 'limpeza do mês');
            if (!applySaveStatus(saveResult, `Mês ${month} removido.`)) return;
            ManualModule.resetManualForm();
            UiModule.renderAll();
        }
        async function clearAll() {
            if (!(await ModalService.confirm({ title: 'Apagar tudo', message: 'Isso apagará todos os meses armazenados. Continuar?', confirmLabel: 'Apagar tudo', confirmClass: 'bad' }))) return;
            const db = StorageAdapter.loadDb();
            const snapshotOk = StorageAdapter.saveSnapshot(db, 'snapshot antes de apagar tudo');
            if (!snapshotOk) {
                UiModule.setStatus('Não foi possível criar snapshot automático antes da limpeza. Operação cancelada para evitar perda de dados.', 'bad');
                return;
            }
            const clearResult = await StorageAdapter.clearDb(initialDb());
            const clearedLocal = !!clearResult.clearedLocal;
            const clearedIndexed = !!clearResult.clearedIndexed;
            if (!clearedLocal && !clearedIndexed) {
                UiModule.setStatus('Falha ao apagar dados na base local.', 'bad');
                return;
            }
            UiModule.renderAll();
            ManualModule.resetManualForm();
            if (!clearedLocal && clearedIndexed) {
                UiModule.setStatus('Dados principais apagados no IndexedDB. Aviso: não foi possível limpar o espelho no localStorage.', 'warn');
                return;
            }
            UiModule.setStatus('Todos os dados locais foram apagados. Você ainda pode restaurar o último backup automático.', 'ok');
        }
        function renderAll() { const month = els.monthRef.value || ''; updateMonthRefInfo(); renderSubjectSuggestions(); renderEmployeeSuggestions(); renderDashboardForMonth(month); renderMonths(); renderManualForMonth(month); renderAuditForMonth(month); renderHistoryForMonth(month, els.historySource.value) }
        // Internal module contracts used during the gradual refactor.
        const NormalizationService = {
            normalizeText,
            normalizeSubjectPattern,
            normalizeDateValue,
            normalizeHeader,
            formatDateBr,
            monthFromIsoDate
        };
        const AuditModule = {
            importSystemBase,
            compareBases,
            compareMonthToPrevious,
            renderDashboardForMonth,
            renderAuditForMonth,
            renderHistoryForMonth,
            exportMissingCsv,
            runComparisonForCurrentMonth() {
                const month = ensureMonthSelected();
                if (!month) return;
                this.renderAuditForMonth(month);
                const monthPack = StorageAdapter.loadDb().months[month] || { manual: [], system: [] };
                const summary = this.compareBases(monthPack.system || [], monthPack.manual || []).summary;
                const divergentes = summary.soSistema + summary.soManual;
                UiModule.setStatus(divergentes ? `Auditoria concluída. ${divergentes} ID(s) divergente(s).` : 'Auditoria concluída. Tudo conferido.', divergentes ? 'warn' : 'ok');
            },
            setFilterMode(mode) {
                auditFilterMode = mode === 'missing' ? 'missing' : 'all';
                this.renderAuditForMonth(els.monthRef.value || '');
                UiModule.setStatus(auditFilterMode === 'missing' ? 'Exibindo somente divergentes.' : 'Exibindo todos os IDs.', auditFilterMode === 'missing' ? 'warn' : 'ok');
            }
        };
        const ManualModule = {
            importManualBase,
            saveManualEntry,
            editManualEntry,
            deleteManualEntry,
            renderManualForMonth,
            resetManualForm,
            exportManualCsv
        };
        const UiModule = {
            setStatus,
            renderAll,
            setActiveTab,
            initTabs,
            setReferenceMonth(month, msg = '') { setReferenceMonth(month, msg) },
            shiftReferenceMonth(delta) {
                const target = shiftMonth(els.monthRef.value || currentMonthValue(), delta);
                this.setReferenceMonth(target, `Mês de referência alterado para ${target}.`);
            },
            setCurrentMonth() {
                const current = currentMonthValue();
                this.setReferenceMonth(current, `Mês de referência alterado para ${current}.`);
            }
        };
        const MaintenanceModule = {
            exportJson,
            importJsonBackup,
            restoreLastBackup,
            clearMonth,
            clearAll,
            openImportJsonPicker() { els.backupJsonFile.click() }
        };
        // Bind UI events once to avoid duplicate listeners after re-initialization.
        let eventsBound = false;
        function bindEventHandlers() {
            if (eventsBound) return;
            eventsBound = true;
            els.manualTableArea.addEventListener('click', e => {
                const btn = e.target.closest('button[data-id]');
                if (!btn) return;
                const id = decodeURIComponent(btn.dataset.id || '');
                if (btn.classList.contains('js-edit-manual')) ManualModule.editManualEntry(id);
                if (btn.classList.contains('js-delete-manual')) ManualModule.deleteManualEntry(id);
            });
            els.btnImportSystem.addEventListener('click', AuditModule.importSystemBase);
            els.btnCompare.addEventListener('click', () => AuditModule.runComparisonForCurrentMonth());
            els.btnShowAllAudit.addEventListener('click', () => AuditModule.setFilterMode('all'));
            els.btnShowOnlyMissing.addEventListener('click', () => AuditModule.setFilterMode('missing'));
            els.btnPrevMonth.addEventListener('click', () => UiModule.shiftReferenceMonth(-1));
            els.btnCurrentMonth.addEventListener('click', () => UiModule.setCurrentMonth());
            els.btnNextMonth.addEventListener('click', () => UiModule.shiftReferenceMonth(1));
            els.btnExportMissingCsv.addEventListener('click', AuditModule.exportMissingCsv);
            els.btnExportJson.addEventListener('click', MaintenanceModule.exportJson);
            els.btnImportJson.addEventListener('click', () => MaintenanceModule.openImportJsonPicker());
            els.backupJsonFile.addEventListener('change', MaintenanceModule.importJsonBackup);
            els.btnRestoreLastBackup.addEventListener('click', MaintenanceModule.restoreLastBackup);
            els.btnClearMonth.addEventListener('click', MaintenanceModule.clearMonth);
            els.btnClearAll.addEventListener('click', MaintenanceModule.clearAll);
            els.btnImportManual.addEventListener('click', ManualModule.importManualBase);
            els.btnSaveManual.addEventListener('click', ManualModule.saveManualEntry);
            els.btnCancelEdit.addEventListener('click', () => {
                ManualModule.resetManualForm();
                UiModule.setStatus('Edição cancelada.', 'ok');
            });
            els.btnExportManualCsv.addEventListener('click', ManualModule.exportManualCsv);
            els.manualSubject.addEventListener('input', () => {
                const formatted = SubjectCatalog.normalize(els.manualSubject.value);
                if (els.manualSubject.value !== formatted) els.manualSubject.value = formatted;
            });
            els.manualEmployee.addEventListener('blur', () => {
                const normalized = normalizeEmployeeName(els.manualEmployee.value);
                if (normalized && els.manualEmployee.value !== normalized) els.manualEmployee.value = normalized;
            });
            ;[els.manualId, els.manualDate, els.manualSubject, els.manualEmployee].forEach(el => el.addEventListener('keydown', handleManualEnterSave));
            els.monthRef.addEventListener('change', () => {
                ManualModule.resetManualForm();
                UiModule.renderAll();
            if (!window.XLSX) UiModule.setStatus(spreadsheetSupportMessage(), 'info');
            });
            els.historySource.addEventListener('change', () => AuditModule.renderHistoryForMonth(els.monthRef.value || '', els.historySource.value));
            els.searchAudit.addEventListener('input', () => AuditModule.renderAuditForMonth(els.monthRef.value || ''));
            els.filterAuditEmployee.addEventListener('input', () => AuditModule.renderAuditForMonth(els.monthRef.value || ''));
            els.filterAuditSubject.addEventListener('input', () => AuditModule.renderAuditForMonth(els.monthRef.value || ''));
            els.filterAuditDate.addEventListener('change', () => AuditModule.renderAuditForMonth(els.monthRef.value || ''));
            els.monthsList.addEventListener('click', e => {
                const b = e.target.closest('button[data-month]');
                if (!b) return;
                const m = b.dataset.month || '';
                if (!m) return;
                UiModule.setReferenceMonth(m, `Mês de referência alterado para ${m}.`);
            });
        }
        window.editManualEntry = ManualModule.editManualEntry;
        window.deleteManualEntry = ManualModule.deleteManualEntry;
        async function initializeApplication() {
            initModalService();
            bindEventHandlers();
            setDefaultMonth();
            try {
                await StorageAdapter.initialize();
            } catch {
                const indexedFallback = await readStoredHandle(FS_MAIN_DB_KEY);
                if (indexedFallback && typeof indexedFallback === 'object') {
                    mainDbCache = normalizeDbShape(indexedFallback);
                    indexedDbCapable = true;
                    primaryStorageMode = 'indexedDB';
                    try { localStorage.setItem(DB_KEY, JSON.stringify(mainDbCache)) } catch { }
                } else {
                    mainDbCache = StorageAdapter.loadDb();
                }
            }
            UiModule.initTabs();
            UiModule.renderAll();
            if (!window.XLSX) UiModule.setStatus(spreadsheetSupportMessage(), 'info');
        }
        void initializeApplication();
