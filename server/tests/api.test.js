import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { buildApp } from '../src/app.js';

const apps = [];

function makeTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apr-control-server-'));
  return { dir, dbPath: path.join(dir, 'app.db') };
}

function multipartBody(fieldName, filename, content, boundary = '----APRControlBoundary') {
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${boundary}--\r\n`,
  ];
  return { boundary, payload: parts.join('') };
}

afterEach(async () => {
  while (apps.length) {
    const app = apps.pop();
    await app.close();
  }
});

describe('server api', () => {
  test('supports manual CRUD and monthly summary', async () => {
    const { dbPath } = makeTempDb();
    const app = await buildApp({ dbPath, logger: false, webDistPath: path.join(process.cwd(), 'missing-dist') });
    apps.push(app);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/months/2026-03/manual',
      payload: {
        aprId: '500',
        dataAbertura: '2026-03-04',
        assunto: 'Mapeamento',
        colaborador: 'RENAN MEDINA SCHULTZ',
      },
    });
    expect(createResponse.statusCode).toBe(200);

    const summaryResponse = await app.inject({ method: 'GET', url: '/api/months/2026-03/summary' });
    const summary = summaryResponse.json();
    expect(summary.manualCount).toBe(1);
    expect(summary.systemCount).toBe(0);

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/months/2026-03/manual/500',
      payload: {
        aprId: '500',
        dataAbertura: '2026-03-05',
        assunto: 'Podas',
        colaborador: 'VENICIO DOS SANTOS LEAL',
      },
    });
    expect(updateResponse.statusCode).toBe(200);

    const deleteResponse = await app.inject({ method: 'DELETE', url: '/api/months/2026-03/manual/500' });
    expect(deleteResponse.statusCode).toBe(200);

    const afterDelete = await app.inject({ method: 'GET', url: '/api/months/2026-03/manual' });
    expect(afterDelete.json()).toEqual([]);
  });

  test('uses the fixed collaborator catalog and accepts new collaborators from maintenance', async () => {
    const { dbPath } = makeTempDb();
    const app = await buildApp({ dbPath, logger: false, webDistPath: path.join(process.cwd(), 'missing-dist') });
    apps.push(app);

    const { boundary, payload } = multipartBody('file', 'system.csv', 'ID;Data de abertura;Assunto;Colaborador\n100;03/02/2026;Mapeamento;Felipe\n200;04/02/2026;Podas;Renan');
    const importResponse = await app.inject({
      method: 'POST',
      url: '/api/import/system?refMonth=2026-02',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(importResponse.statusCode).toBe(200);

    const catalogResponse = await app.inject({ method: 'GET', url: '/api/months/2026-02/catalog' });
    const catalog = catalogResponse.json();
    expect(catalog.assuntos).toEqual(['MAPEAMENTO', 'PODAS']);
    expect(catalog.colaboradores).toEqual([
      'RENAN MEDINA SCHULTZ',
      'VENICIO DOS SANTOS LEAL',
      'HARISSON LUCAS CRUZ RESENDE',
      'FELIPE EDWIN SANTOS OLIVEIRA',
      'JOÃO PEDRO DO CARMO ALMEIDA',
    ]);

    const addCollaboratorResponse = await app.inject({
      method: 'POST',
      url: '/api/maintenance/collaborators',
      payload: { name: 'Marcos Vinicius Teste' },
    });
    expect(addCollaboratorResponse.statusCode).toBe(200);
    expect(addCollaboratorResponse.json().colaboradores).toContain('MARCOS VINICIUS TESTE');

    const validManual = await app.inject({
      method: 'POST',
      url: '/api/months/2026-02/manual',
      payload: {
        aprId: '300',
        dataAbertura: '2026-02-05',
        assunto: 'Podas',
        colaborador: 'MARCOS VINICIUS TESTE',
      },
    });
    expect(validManual.statusCode).toBe(200);

    const invalidManual = await app.inject({
      method: 'POST',
      url: '/api/months/2026-02/manual',
      payload: {
        aprId: '301',
        dataAbertura: '2026-02-05',
        assunto: 'Assunto livre',
        colaborador: 'COLABORADOR LIVRE',
      },
    });
    expect(invalidManual.statusCode).toBe(400);

    const exportResponse = await app.inject({ method: 'GET', url: '/api/export/divergentes.csv?refMonth=2026-02' });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.body).toContain('100');
  });

  test('rejects unsupported upload extensions', async () => {
    const { dbPath } = makeTempDb();
    const app = await buildApp({ dbPath, logger: false, webDistPath: path.join(process.cwd(), 'missing-dist') });
    apps.push(app);

    const { boundary, payload } = multipartBody('file', 'system.txt', 'ID;Data de abertura;Assunto;Colaborador\n100;03/02/2026;Mapeamento;Felipe');
    const response = await app.inject({
      method: 'POST',
      url: '/api/import/system?refMonth=2026-02',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Formato de arquivo inválido');
  });

  test('clears a month and restores the latest snapshot', async () => {
    const { dbPath } = makeTempDb();
    const app = await buildApp({ dbPath, logger: false, webDistPath: path.join(process.cwd(), 'missing-dist') });
    apps.push(app);

    await app.inject({
      method: 'POST',
      url: '/api/months/2026-01/manual',
      payload: {
        aprId: '900',
        dataAbertura: '2026-01-03',
        assunto: 'Mapeamento',
        colaborador: 'RENAN MEDINA SCHULTZ',
      },
    });

    const clearResponse = await app.inject({ method: 'POST', url: '/api/maintenance/clear-month', payload: { refMonth: '2026-01' } });
    expect(clearResponse.statusCode).toBe(200);

    const restoreResponse = await app.inject({ method: 'POST', url: '/api/maintenance/restore-latest' });
    expect(restoreResponse.statusCode).toBe(200);

    const rows = await app.inject({ method: 'GET', url: '/api/months/2026-01/manual' });
    expect(rows.json()).toHaveLength(1);
  });
});
