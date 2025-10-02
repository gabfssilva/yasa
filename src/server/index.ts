// src/server/index.ts
import Fastify from 'fastify';
import { loadManifests } from '../manifest/loader.js';
import { validateRegistry } from '../manifest/validator.js';
import { registerChatRoutes } from './routes/chat.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cria e configura o servidor Fastify
 */
export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Configura CORS
  await fastify.register(import('@fastify/cors'), {
    origin: true,
  });

  // Carrega e valida manifests no startup
  fastify.log.info('Loading manifests...');

  const configDir = path.join(__dirname, '../../configuration');
  const registry = await loadManifests(configDir);

  fastify.log.info('Validating manifests...');
  validateRegistry(registry);

  // Registra rotas
  registerChatRoutes(fastify, registry);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Root
  fastify.get('/', async () => {
    return {
      name: 'YASA - Yet Another Agent System',
      version: '0.1.0',
      description: 'OpenAI-compatible API for YAML-based agents',
      endpoints: {
        health: 'GET /health',
        models: 'GET /v1/models',
        modelInfo: 'GET /v1/models/:modelId',
        chatCompletions: 'POST /v1/chat/completions',
      },
      usage: {
        listModels: 'curl http://localhost:3000/v1/models',
        chatCompletion: 'curl -X POST http://localhost:3000/v1/chat/completions -d \'{"model":"teams/support/assistant","messages":[{"role":"user","content":"Hello"}]}\'',
      },
    };
  });

  return fastify;
}

/**
 * Inicia o servidor
 */
async function start() {
  try {
    const fastify = await createServer();

    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`
┌─────────────────────────────────────────────┐
│                                             │
│   YASA - Yet Another Agent System           │
│   OpenAI-compatible API for YAML agents     │
│                                             │
│   Server running at:                        │
│   http://localhost:${port}                  │
│                                             │
│   Endpoints:                                │
│   - GET  /health                            │
│   - GET  /v1/models                         │
│   - GET  /v1/models/:modelId                │
│   - POST /v1/chat/completions               │
│                                             │
└─────────────────────────────────────────────┘
    `);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Se executado diretamente (não importado)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
