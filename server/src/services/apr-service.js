import fs from 'node:fs';
import {
  assignRowsToReferenceMonth,
  buildLegacySnapshot,
  compareBases,
  compareMonthToPrevious,
  DEFAULT_EMPLOYEES,
  flattenLegacyDb,
  monthFromIsoDate,
  normalizeEmployeeName,
  normalizeSubjectPattern,
  normalizeText,
  parseLegacyDb,
  parseSpreadsheetBuffer,
  normalizeAndValidateRows,
  isValidIsoDate,
} from '@apr-control/shared';

function assertRefMonth(refMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(refMonth || ''))) {
    throw new Error('Mês de referência inválido. Use YYYY-MM.');
  }
}

function matchCatalogValue(values, value) {
  return (values || []).find(item => normalizeText(item) === normalizeText(value)) || null;
}

function normalizeManualPayload(payload, catalog = null) {
  const aprId = String(payload?.aprId ?? payload?.ID ?? '').trim();
  const dataAbertura = String(payload?.dataAbertura ?? '').trim();
  const assunto = normalizeSubjectPattern(payload?.assunto ?? '');
  const colaborador = normalizeEmployeeName(payload?.colaborador ?? '');
  if (!aprId) throw new Error('APR ID ? obrigat?rio.');
  if (!isValidIsoDate(dataAbertura)) throw new Error('Data de abertura inv?lida. Use YYYY-MM-DD.');
  if (!assunto) throw new Error('Assunto ? obrigat?rio.');
  if (!colaborador) throw new Error('Colaborador ? obrigat?rio.');

  const assuntoCatalogado = matchCatalogValue(catalog?.assuntos, assunto);
  const colaboradorCatalogado = matchCatalogValue(catalog?.colaboradores, colaborador);

  if ((catalog?.assuntos || []).length && !assuntoCatalogado) {
    throw new Error('Assunto deve seguir a lista fixa dos registros importados do m?s.');
  }
  if ((catalog?.colaboradores || []).length && !colaboradorCatalogado) {
    throw new Error('Colaborador deve seguir a lista fixa dos registros importados do m?s.');
  }

  return {
    aprId,
    dataAbertura,
    assunto: assuntoCatalogado || assunto,
    colaborador: colaboradorCatalogado || colaborador,
  };
}

function mapRecordRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    refMonth: row.ref_month,
    source: row.source,
    aprId: row.apr_id,
    dataAbertura: row.data_abertura,
    assunto: row.assunto,
    colaborador: row.colaborador,
    importedAt: row.imported_at,
    importBatchId: row.import_batch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function previousMonth(refMonth) {
  const [year, month] = String(refMonth).split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function normalizeCollaboratorCatalogName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
}

export function createAprService(db) {
  const ensureMonthRefStmt = db.prepare(`
    INSERT INTO month_refs (ref_month, created_at)
    VALUES (@refMonth, @createdAt)
    ON CONFLICT(ref_month) DO NOTHING
  `);
  const listMonthsStmt = db.prepare(`
    SELECT mr.ref_month,
      SUM(CASE WHEN ar.source = 'manual' THEN 1 ELSE 0 END) AS manual_count,
      SUM(CASE WHEN ar.source = 'system' THEN 1 ELSE 0 END) AS system_count,
      MAX(ar.updated_at) AS last_updated
    FROM month_refs mr
    LEFT JOIN apr_records ar ON ar.ref_month = mr.ref_month
    GROUP BY mr.ref_month
    ORDER BY mr.ref_month DESC
  `);
  const getRowsByMonthStmt = db.prepare(`
    SELECT * FROM apr_records
    WHERE ref_month = ? AND source = ?
    ORDER BY apr_id COLLATE NOCASE ASC
  `);
  const getImportedSubjectsStmt = db.prepare(`
    SELECT DISTINCT assunto FROM apr_records
    WHERE ref_month = ? AND (import_batch_id IS NOT NULL OR imported_at IS NOT NULL)
    ORDER BY assunto COLLATE NOCASE ASC
  `);
  const listCustomCollaboratorsStmt = db.prepare(`
    SELECT name FROM collaborator_catalog
    ORDER BY name COLLATE NOCASE ASC
  `);
  const insertCustomCollaboratorStmt = db.prepare(`
    INSERT INTO collaborator_catalog (name, created_at)
    VALUES (@name, @createdAt)
  `);
  const getRecordStmt = db.prepare(`
    SELECT * FROM apr_records WHERE ref_month = ? AND source = ? AND apr_id = ?
  `);
  const insertRecordStmt = db.prepare(`
    INSERT INTO apr_records (
      ref_month, source, apr_id, data_abertura, assunto, colaborador, imported_at, import_batch_id, created_at, updated_at
    ) VALUES (
      @refMonth, @source, @aprId, @dataAbertura, @assunto, @colaborador, @importedAt, @importBatchId, @createdAt, @updatedAt
    )
  `);
  const updateRecordStmt = db.prepare(`
    UPDATE apr_records
    SET apr_id = @nextAprId,
        data_abertura = @dataAbertura,
        assunto = @assunto,
        colaborador = @colaborador,
        updated_at = @updatedAt
    WHERE ref_month = @refMonth AND source = 'manual' AND apr_id = @currentAprId
  `);
  const deleteRecordStmt = db.prepare(`DELETE FROM apr_records WHERE ref_month = ? AND source = ? AND apr_id = ?`);
  const deleteSourceRecordsStmt = db.prepare(`DELETE FROM apr_records WHERE ref_month = ? AND source = ?`);
  const insertImportBatchStmt = db.prepare(`
    INSERT INTO import_batches (
      source, ref_month, file_name, status, total_valid, total_invalid, duplicates, created_at, notes
    ) VALUES (
      @source, @refMonth, @fileName, @status, @totalValid, @totalInvalid, @duplicates, @createdAt, @notes
    )
  `);
  const getImportBatchesByMonthStmt = db.prepare(`
    SELECT * FROM import_batches WHERE ref_month = ? ORDER BY created_at DESC
  `);
  const getLatestSnapshotStmt = db.prepare(`SELECT * FROM app_snapshots ORDER BY created_at DESC, id DESC LIMIT 1`);
  const insertSnapshotStmt = db.prepare(`
    INSERT INTO app_snapshots (reason, payload_json, created_at)
    VALUES (@reason, @payloadJson, @createdAt)
  `);
  const insertManualChangeStmt = db.prepare(`
    INSERT INTO manual_changes (ref_month, apr_id, action, before_json, after_json, changed_at)
    VALUES (@refMonth, @aprId, @action, @beforeJson, @afterJson, @changedAt)
  `);
  const deleteMonthRefsStmt = db.prepare(`DELETE FROM month_refs WHERE ref_month = ?`);
  const deleteMonthImportBatchesStmt = db.prepare(`DELETE FROM import_batches WHERE ref_month = ?`);
  const deleteMonthManualChangesStmt = db.prepare(`DELETE FROM manual_changes WHERE ref_month = ?`);
  const deleteAllMonthRefsStmt = db.prepare(`DELETE FROM month_refs`);
  const deleteAllImportBatchesStmt = db.prepare(`DELETE FROM import_batches`);
  const deleteAllManualChangesStmt = db.prepare(`DELETE FROM manual_changes`);
  const deleteAllRecordsStmt = db.prepare(`DELETE FROM apr_records`);
  const countRecordsStmt = db.prepare(`SELECT COUNT(*) AS total FROM apr_records`);
  const selectAllRecordsStmt = db.prepare(`
    SELECT ref_month, source, apr_id, data_abertura, assunto, colaborador
    FROM apr_records
    ORDER BY ref_month ASC, source ASC, apr_id ASC
  `);

  const replaceSourceRecordsTx = db.transaction(({ refMonth, source, rows, importBatchId, importedAt }) => {
    ensureMonthRefStmt.run({ refMonth, createdAt: importedAt });
    deleteSourceRecordsStmt.run(refMonth, source);
    for (const row of rows) {
      insertRecordStmt.run({
        refMonth,
        source,
        aprId: row.aprId,
        dataAbertura: row.dataAbertura,
        assunto: row.assunto,
        colaborador: row.colaborador,
        importedAt,
        importBatchId,
        createdAt: importedAt,
        updatedAt: importedAt,
      });
    }
  });

  const importLegacyTx = db.transaction(({ months, records }) => {
    deleteAllRecordsStmt.run();
    deleteAllImportBatchesStmt.run();
    deleteAllManualChangesStmt.run();
    deleteAllMonthRefsStmt.run();
    months.forEach(month => ensureMonthRefStmt.run({ refMonth: month.refMonth, createdAt: month.createdAt || new Date().toISOString() }));
    records.forEach(record => {
      insertRecordStmt.run({
        refMonth: record.refMonth,
        source: record.source,
        aprId: record.aprId,
        dataAbertura: record.dataAbertura,
        assunto: record.assunto,
        colaborador: record.colaborador,
        importedAt: record.importedAt,
        importBatchId: null,
        createdAt: record.importedAt || new Date().toISOString(),
        updatedAt: record.importedAt || new Date().toISOString(),
      });
    });
  });

  function exportSnapshotPayload() {
    const rows = selectAllRecordsStmt.all().map(row => ({
      refMonth: row.ref_month,
      source: row.source,
      aprId: row.apr_id,
      dataAbertura: row.data_abertura,
      assunto: row.assunto,
      colaborador: row.colaborador,
    }));
    return buildLegacySnapshot(rows);
  }

  function createSnapshot(reason) {
    const payloadJson = JSON.stringify(exportSnapshotPayload());
    const createdAt = new Date().toISOString();
    insertSnapshotStmt.run({ reason, payloadJson, createdAt });
    return { reason, createdAt };
  }

  function listMonths() {
    return listMonthsStmt.all().map(row => ({
      refMonth: row.ref_month,
      manualCount: Number(row.manual_count || 0),
      systemCount: Number(row.system_count || 0),
      lastUpdated: row.last_updated,
    }));
  }

  function getRows(refMonth, source) {
    assertRefMonth(refMonth);
    return getRowsByMonthStmt.all(refMonth, source).map(mapRecordRow);
  }

  function listCollaborators() {
    const custom = listCustomCollaboratorsStmt.all().map(row => row.name);
    return [...DEFAULT_EMPLOYEES, ...custom.filter(name => !DEFAULT_EMPLOYEES.some(item => normalizeText(item) === normalizeText(name)))];
  }

  function addCollaborator(name) {
    const normalizedName = normalizeCollaboratorCatalogName(name);
    if (!normalizedName) throw new Error('Nome do colaborador ? obrigat?rio.');
    if (listCollaborators().some(item => normalizeText(item) === normalizeText(normalizedName))) {
      throw new Error('Colaborador j? cadastrado.');
    }
    insertCustomCollaboratorStmt.run({ name: normalizedName, createdAt: new Date().toISOString() });
    return {
      name: normalizedName,
      colaboradores: listCollaborators(),
    };
  }

  function getImportCatalog(refMonth) {
    assertRefMonth(refMonth);
    return {
      refMonth,
      assuntos: getImportedSubjectsStmt.all(refMonth).map(row => row.assunto),
      colaboradores: listCollaborators(),
    };
  }

  function getMonthSummary(refMonth) {
    assertRefMonth(refMonth);
    const manualRows = getRows(refMonth, 'manual');
    const systemRows = getRows(refMonth, 'system');
    const audit = compareBases(systemRows, manualRows);
    return {
      refMonth,
      manualCount: manualRows.length,
      systemCount: systemRows.length,
      divergences: audit.summary.soSistema + audit.summary.soManual,
      summary: audit.summary,
      imports: getImportBatchesByMonthStmt.all(refMonth).map(row => ({
        id: row.id,
        source: row.source,
        fileName: row.file_name,
        status: row.status,
        totalValid: row.total_valid,
        totalInvalid: row.total_invalid,
        duplicates: row.duplicates,
        createdAt: row.created_at,
        notes: row.notes,
      })),
    };
  }

  function createManualRecord(refMonth, payload) {
    assertRefMonth(refMonth);
    const normalized = normalizeManualPayload(payload, getImportCatalog(refMonth));
    if (getRecordStmt.get(refMonth, 'manual', normalized.aprId)) {
      throw new Error('Já existe lançamento manual com esse ID no mês.');
    }
    const now = new Date().toISOString();
    ensureMonthRefStmt.run({ refMonth, createdAt: now });
    insertRecordStmt.run({
      refMonth,
      source: 'manual',
      aprId: normalized.aprId,
      dataAbertura: normalized.dataAbertura,
      assunto: normalized.assunto,
      colaborador: normalized.colaborador,
      importedAt: null,
      importBatchId: null,
      createdAt: now,
      updatedAt: now,
    });
    insertManualChangeStmt.run({
      refMonth,
      aprId: normalized.aprId,
      action: 'create',
      beforeJson: null,
      afterJson: JSON.stringify(normalized),
      changedAt: now,
    });
    createSnapshot(`manual:create:${refMonth}:${normalized.aprId}`);
    return getRecord(refMonth, 'manual', normalized.aprId);
  }

  function getRecord(refMonth, source, aprId) {
    return mapRecordRow(getRecordStmt.get(refMonth, source, aprId));
  }

  function updateManualRecord(refMonth, aprId, payload) {
    assertRefMonth(refMonth);
    const current = getRecord(refMonth, 'manual', aprId);
    if (!current) throw new Error('Registro manual não encontrado.');
    const normalized = normalizeManualPayload({ ...payload, aprId: payload?.aprId ?? aprId }, getImportCatalog(refMonth));
    if (normalized.aprId !== aprId && getRecordStmt.get(refMonth, 'manual', normalized.aprId)) {
      throw new Error('Já existe lançamento manual com esse ID no mês.');
    }
    const now = new Date().toISOString();
    updateRecordStmt.run({
      refMonth,
      currentAprId: aprId,
      nextAprId: normalized.aprId,
      dataAbertura: normalized.dataAbertura,
      assunto: normalized.assunto,
      colaborador: normalized.colaborador,
      updatedAt: now,
    });
    insertManualChangeStmt.run({
      refMonth,
      aprId: normalized.aprId,
      action: 'update',
      beforeJson: JSON.stringify(current),
      afterJson: JSON.stringify(normalized),
      changedAt: now,
    });
    createSnapshot(`manual:update:${refMonth}:${aprId}`);
    return getRecord(refMonth, 'manual', normalized.aprId);
  }

  function deleteManualRecord(refMonth, aprId) {
    assertRefMonth(refMonth);
    const current = getRecord(refMonth, 'manual', aprId);
    if (!current) throw new Error('Registro manual não encontrado.');
    const now = new Date().toISOString();
    deleteRecordStmt.run(refMonth, 'manual', aprId);
    insertManualChangeStmt.run({
      refMonth,
      aprId,
      action: 'delete',
      beforeJson: JSON.stringify(current),
      afterJson: null,
      changedAt: now,
    });
    createSnapshot(`manual:delete:${refMonth}:${aprId}`);
    return current;
  }

  function importSource(refMonth, source, fileName, buffer) {
    assertRefMonth(refMonth);
    const rawRows = parseSpreadsheetBuffer(buffer, fileName);
    const parsed = normalizeAndValidateRows(rawRows);
    const createdAt = new Date().toISOString();
    const notes = [];
    if (parsed.invalid.length) notes.push(`${parsed.invalid.length} linha(s) inválida(s)`);
    if (parsed.duplicates.length) notes.push(`${parsed.duplicates.length} ID(s) duplicado(s)`);
    const batchInfo = {
      source,
      refMonth,
      fileName,
      status: parsed.rows.length ? 'success' : 'failed',
      totalValid: parsed.rows.length,
      totalInvalid: parsed.invalid.length,
      duplicates: parsed.duplicates.length,
      createdAt,
      notes: notes.join('. '),
    };
    const batchResult = insertImportBatchStmt.run(batchInfo);
    if (!parsed.rows.length) {
      throw new Error('Nenhum registro válido encontrado na planilha.');
    }
    const rows = assignRowsToReferenceMonth(parsed.rows, refMonth, source);
    replaceSourceRecordsTx({
      refMonth,
      source,
      rows,
      importBatchId: batchResult.lastInsertRowid,
      importedAt: createdAt,
    });
    createSnapshot(`import:${source}:${refMonth}`);
    return {
      importBatchId: batchResult.lastInsertRowid,
      refMonth,
      source,
      fileName,
      totalValid: parsed.rows.length,
      totalInvalid: parsed.invalid.length,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid,
    };
  }

  function getAudit(refMonth) {
    assertRefMonth(refMonth);
    const manualRows = getRows(refMonth, 'manual');
    const systemRows = getRows(refMonth, 'system');
    return {
      refMonth,
      ...compareBases(systemRows, manualRows),
    };
  }

  function getHistory(refMonth, source) {
    assertRefMonth(refMonth);
    const currentRows = getRows(refMonth, source);
    const previousRows = getRows(previousMonth(refMonth), source);
    return {
      refMonth,
      previousMonth: previousMonth(refMonth),
      source,
      ...compareMonthToPrevious(currentRows, previousRows, { includeRemoved: false }),
    };
  }

  function exportManualCsv(refMonth) {
    const rows = getRows(refMonth, 'manual');
    const header = ['APR ID', 'Data de abertura', 'Assunto', 'Colaborador'];
    const lines = [header.map(csvEscape).join(';')];
    rows.forEach(row => {
      lines.push([row.aprId, row.dataAbertura, row.assunto, row.colaborador].map(csvEscape).join(';'));
    });
    return '\uFEFF' + lines.join('\n');
  }

  function exportDivergencesCsv(refMonth) {
    const audit = getAudit(refMonth);
    const divergences = audit.details.filter(item => item.status !== 'Conferido');
    const header = ['APR ID', 'Status', 'Data Sistema', 'Data Manual', 'Assunto Sistema', 'Assunto Manual', 'Colaborador Sistema', 'Colaborador Manual'];
    const lines = [header.map(csvEscape).join(';')];
    divergences.forEach(item => {
      lines.push([
        item.aprId,
        item.status,
        item.system?.dataAbertura || '',
        item.manual?.dataAbertura || '',
        item.system?.assunto || '',
        item.manual?.assunto || '',
        item.system?.colaborador || '',
        item.manual?.colaborador || '',
      ].map(csvEscape).join(';'));
    });
    return '\uFEFF' + lines.join('\n');
  }

  function clearMonth(refMonth) {
    assertRefMonth(refMonth);
    createSnapshot(`maintenance:clear-month:${refMonth}`);
    deleteSourceRecordsStmt.run(refMonth, 'manual');
    deleteSourceRecordsStmt.run(refMonth, 'system');
    deleteMonthImportBatchesStmt.run(refMonth);
    deleteMonthManualChangesStmt.run(refMonth);
    deleteMonthRefsStmt.run(refMonth);
    return { refMonth };
  }

  function clearAll() {
    createSnapshot('maintenance:clear-all');
    deleteAllRecordsStmt.run();
    deleteAllImportBatchesStmt.run();
    deleteAllManualChangesStmt.run();
    deleteAllMonthRefsStmt.run();
    return { cleared: true };
  }

  function restoreLatestSnapshot() {
    const snapshot = getLatestSnapshotStmt.get();
    if (!snapshot) throw new Error('Nenhum snapshot disponível.');
    const flattened = flattenLegacyDb(parseLegacyDb(snapshot.payload_json));
    importLegacyTx(flattened);
    createSnapshot(`maintenance:restore:${snapshot.id}`);
    return { restoredFromSnapshotId: snapshot.id, createdAt: snapshot.created_at };
  }

  function migrateLegacyFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo legado não encontrado: ${filePath}`);
    }
    const flattened = flattenLegacyDb(fs.readFileSync(filePath, 'utf8'));
    if (countRecordsStmt.get().total > 0) {
      createSnapshot('migration:before-legacy-import');
    }
    importLegacyTx(flattened);
    createSnapshot('migration:legacy-import');
    return {
      months: flattened.months.length,
      records: flattened.records.length,
    };
  }

  return {
    listMonths,
    getMonthSummary,
    getRows,
    getImportCatalog,
    listCollaborators,
    addCollaborator,
    createManualRecord,
    updateManualRecord,
    deleteManualRecord,
    importSource,
    getAudit,
    getHistory,
    exportManualCsv,
    exportDivergencesCsv,
    restoreLatestSnapshot,
    clearMonth,
    clearAll,
    migrateLegacyFile,
    createSnapshot,
  };
}

