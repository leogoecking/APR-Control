function manualPayload(body) {
  return {
    aprId: body?.aprId,
    dataAbertura: body?.dataAbertura,
    assunto: body?.assunto,
    colaborador: body?.colaborador,
  };
}

function invalidRequest(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function fileExtension(fileName) {
  return String(fileName || '').split('.').pop()?.toLowerCase() || '';
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function apiRoutes(fastify) {
  const service = fastify.aprService;

  fastify.get('/api/health', async () => ({ status: 'ok', service: 'apr-control-server' }));
  fastify.get('/api/months', async () => service.listMonths());
  fastify.get('/api/months/:refMonth/summary', async request => service.getMonthSummary(request.params.refMonth));
  fastify.get('/api/months/:refMonth/manual', async request => service.getRows(request.params.refMonth, 'manual'));
  fastify.get('/api/months/:refMonth/catalog', async request => service.getImportCatalog(request.params.refMonth));
  fastify.post('/api/months/:refMonth/manual', async request => service.createManualRecord(request.params.refMonth, manualPayload(request.body)));
  fastify.put('/api/months/:refMonth/manual/:aprId', async request => service.updateManualRecord(request.params.refMonth, request.params.aprId, manualPayload(request.body)));
  fastify.delete('/api/months/:refMonth/manual/:aprId', async request => service.deleteManualRecord(request.params.refMonth, request.params.aprId));

  fastify.post('/api/import/:source', async request => {
    const { source } = request.params;
    if (!['manual', 'system'].includes(source)) {
      throw invalidRequest('Fonte de importação inválida.');
    }
    const { refMonth } = request.query;
    const file = await request.file();
    if (!file) {
      throw invalidRequest('Arquivo não enviado.');
    }
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension(file.filename))) {
      throw invalidRequest('Formato de arquivo inválido. Envie CSV, XLSX ou XLS.');
    }
    const buffer = await streamToBuffer(file.file);
    return service.importSource(refMonth, source, file.filename, buffer);
  });

  fastify.get('/api/months/:refMonth/audit', async request => service.getAudit(request.params.refMonth));
  fastify.get('/api/months/:refMonth/history', async request => service.getHistory(request.params.refMonth, request.query.source || 'manual'));

  fastify.get('/api/export/manual.csv', async (request, reply) => {
    const csv = service.exportManualCsv(request.query.refMonth);
    reply.header('content-type', 'text/csv; charset=utf-8');
    return csv;
  });

  fastify.get('/api/export/divergentes.csv', async (request, reply) => {
    const csv = service.exportDivergencesCsv(request.query.refMonth);
    reply.header('content-type', 'text/csv; charset=utf-8');
    return csv;
  });

  fastify.get('/api/maintenance/collaborators', async () => ({ colaboradores: service.listCollaborators() }));
  fastify.post('/api/maintenance/collaborators', async request => service.addCollaborator(request.body?.name));
  fastify.post('/api/maintenance/restore-latest', async () => service.restoreLatestSnapshot());
  fastify.post('/api/maintenance/clear-month', async request => service.clearMonth(request.body?.refMonth));
  fastify.post('/api/maintenance/clear-all', async () => service.clearAll());
}
