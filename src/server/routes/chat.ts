// src/server/routes/chat.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ManifestRegistry } from '../../manifest/loader.js';
import {
  createAgentFromManifests,
  runAgent,
  runAgentStreaming,
  getAgentInfo,
  type ChatMessage,
} from '../../runtime/agent.js';
import { randomUUID } from 'crypto';
import { transformAgentStreamToOpenAI } from '../streaming.js';

/**
 * Schema para request de Responses API (OpenAI-compatible)
 */
interface ResponsesRequest {
  model: string; // agentId (ex: "teams/support/assistant")
  input: string;
  temperature?: number;
  max_output_tokens?: number;
  stream?: boolean;
}

/**
 * Params da rota de modelos
 */
interface ModelRouteParams {
  agentId: string;
}

/**
 * Registra rotas OpenAI-compatible
 */
export function registerChatRoutes(
  fastify: FastifyInstance,
  registry: ManifestRegistry
) {
  /**
   * POST /v1/responses
   * OpenAI Responses API endpoint
   */
  fastify.post<{
    Body: ResponsesRequest;
  }>(
    '/v1/responses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ResponsesRequest;

      // Extrai agentId do campo model
      const agentId = body.model;

      try {
        // Busca o agente no registry
        const agentManifest = registry.agents.get(agentId);

        if (!agentManifest) {
          return reply.status(404).send({
            error: {
              message: `Agent not found: ${agentId}`,
              type: 'invalid_request_error',
              code: 'agent_not_found',
            },
          });
        }

        // Busca o modelo
        const modelManifest = registry.models.get(agentManifest.agent.model);

        if (!modelManifest) {
          return reply.status(500).send({
            error: {
              message: `Model not found: ${agentManifest.agent.model}`,
              type: 'server_error',
              code: 'model_not_found',
            },
          });
        }

        // Busca as tools
        const toolManifests = (agentManifest.agent.tools || [])
          .map((toolId) => registry.tools.get(toolId))
          .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);

        // Busca as knowledge bases
        const kbManifests = (agentManifest.agent.knowledge || [])
          .map((kbId) => registry.knowledgeBases.get(kbId))
          .filter((kb): kb is NonNullable<typeof kb> => kb !== undefined);

        // Cria agent do SDK
        const agent = createAgentFromManifests(
          agentManifest,
          modelManifest,
          toolManifests,
          kbManifests
        );

        // Converte input para formato de mensagens
        const messages: ChatMessage[] = [{ role: 'user', content: body.input }];

        // Detecta modo streaming
        if (body.stream) {
          // MODO STREAMING - SSE manual
          const stream = await runAgentStreaming(agent, messages, {
            temperature: body.temperature,
            max_tokens: body.max_output_tokens,
          });

          // Set SSE headers
          reply.raw.setHeader('Content-Type', 'text/event-stream');
          reply.raw.setHeader('Cache-Control', 'no-cache');
          reply.raw.setHeader('Connection', 'keep-alive');

          // Send events
          for await (const event of transformAgentStreamToOpenAI(stream, agentId)) {
            // console.log(event.data)
            reply.raw.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
          }

          reply.raw.end();
          return reply;
        } else {
          // MODO NÃO-STREAMING
          const result = await runAgent(agent, messages, {
            temperature: body.temperature,
            max_tokens: body.max_output_tokens,
          });

          // Formata response em formato Responses API
          const response = {
            id: `resp-${randomUUID()}`,
            object: 'response',
            created_at: Math.floor(Date.now() / 1000),
            model: agentId,
            output: [
              {
                id: `msg-${randomUUID()}`,
                type: 'message',
                role: 'assistant',
                content: [
                  {
                    type: 'output_text',
                    text: result.finalOutput,
                  },
                ],
                status: 'completed',
              },
            ],
            status: 'completed',
            usage: {
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0,
            },
          };

          return reply.send(response);
        }
      } catch (error) {
        fastify.log.error(error);

        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'server_error',
            code: 'internal_error',
          },
        });
      }
    }
  );

  /**
   * GET /v1/models/:agentId
   * Retorna informações sobre o agente/modelo
   */
  fastify.get<{
    Params: ModelRouteParams;
  }>(
    '/v1/models/:agentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { agentId } = request.params as ModelRouteParams;

      try {
        // URL decode (ex: "teams%2Fsupport%2Fassistant" -> "teams/support/assistant")
        const decodedAgentId = decodeURIComponent(agentId);
        const agentManifest = registry.agents.get(decodedAgentId);

        if (!agentManifest) {
          return reply.status(404).send({
            error: {
              message: `Agent not found: ${agentId}`,
              type: 'invalid_request_error',
              code: 'agent_not_found',
            },
          });
        }

        const modelManifest = registry.models.get(agentManifest.agent.model);
        const toolManifests = (agentManifest.agent.tools || [])
          .map((toolId) => registry.tools.get(toolId))
          .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
        const kbManifests = (agentManifest.agent.knowledge || [])
          .map((kbId) => registry.knowledgeBases.get(kbId))
          .filter((kb): kb is NonNullable<typeof kb> => kb !== undefined);

        if (!modelManifest) {
          return reply.status(500).send({
            error: {
              message: `Model not found: ${agentManifest.agent.model}`,
              type: 'server_error',
              code: 'model_not_found',
            },
          });
        }

        const info = getAgentInfo(
          agentManifest,
          modelManifest,
          toolManifests,
          kbManifests
        );

        return reply.send(info);
      } catch (error) {
        fastify.log.error(error);

        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'server_error',
            code: 'internal_error',
          },
        });
      }
    }
  );

  /**
   * GET /v1/models
   * Lista todos os agentes/modelos disponíveis (OpenAI-compatible)
   */
  fastify.get('/v1/models', async (request: FastifyRequest, reply: FastifyReply) => {
    const models = Array.from(registry.agents.values()).map((agent) => ({
      id: agent.agent.id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: agent.agent.team || 'system',
      // Campos extras não-padrão mas úteis
      name: agent.agent.name,
      description: agent.agent.description,
      version: agent.agent.version,
    }));

    return reply.send({
      object: 'list',
      data: models,
    });
  });
}
