import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { createDatabase } from './db.js';
import { createAprService } from './services/apr-service.js';
import { apiRoutes } from './routes/api.js';

export async function buildApp(options = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const db = options.db || createDatabase(options.dbPath || config.dbPath);
  const aprService = createAprService(db);

  app.decorate('db', db);
  app.decorate('aprService', aprService);
  app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 400;
    reply.status(statusCode).send({ message: error.message || 'Falha ao processar a requisição.' });
  });

  await app.register(apiRoutes);

  const webRoot = options.webDistPath || config.webDistPath;
  if (fs.existsSync(webRoot)) {
    await app.register(fastifyStatic, {
      root: webRoot,
      prefix: '/',
      wildcard: false,
      index: ['index.html'],
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api/')) {
        return reply.status(404).send({ message: 'Recurso não encontrado.' });
      }
      return reply.sendFile('index.html');
    });
  }

  app.addHook('onClose', async () => {
    if (!options.db && db) db.close();
  });

  return app;
}
