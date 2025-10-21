// src/runtime/agent.ts
import { Agent, run } from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';
import type {
  AgentManifest,
  ModelManifest,
  ToolManifest,
  KnowledgeBaseManifest,
} from '../schemas/manifest.js';
import { createToolsFromManifests } from './tools.js';
import { formatKnowledgeAsContext } from './knowledge.js';

/**
 * Mensagem OpenAI-compatible (para compatibilidade com API)
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

/**
 * Resultado de execução do agente
 */
export interface AgentRunResult {
  finalOutput: string;
  history: unknown[];
}

/**
 * Constrói instruções do agente incluindo knowledge base
 */
function buildInstructions(
  systemPrompt: string,
  knowledgeBases: KnowledgeBaseManifest[]
): string {
  let instructions = systemPrompt;

  // Adiciona contexto de conhecimento se disponível
  if (knowledgeBases.length > 0) {
    const knowledgeContext = formatKnowledgeAsContext(knowledgeBases);
    instructions = `${instructions}\n\n${knowledgeContext}`;
  }

  return instructions;
}

/**
 * Extrai a última mensagem do usuário
 * O SDK do OpenAI Agents é stateless, então passamos apenas a mensagem atual
 */
function getLastUserMessage(messages: ChatMessage[]): string {
  // Busca a última mensagem do usuário
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content || '';
    }
  }

  throw new Error('No user message found in conversation');
}

/**
 * Cria um Agent do SDK a partir dos manifests YAML
 */
export function createAgentFromManifests(
  agentManifest: AgentManifest,
  modelManifest: ModelManifest,
  toolManifests: ToolManifest[],
  knowledgeManifests: KnowledgeBaseManifest[]
): Agent {
  // Cria tools do SDK
  const tools = createToolsFromManifests(toolManifests);

  // Constrói instruções com knowledge
  const instructions = buildInstructions(
    agentManifest.agent.prompt.system,
    knowledgeManifests
  );

  // Cria e retorna o Agent
  return new Agent({
    name: agentManifest.agent.name,
    instructions,
    model: modelManifest.model.name,
    modelSettings: {
      temperature: modelManifest.model.config?.temperature,
      maxTokens: modelManifest.model.config?.max_tokens,
    },
    tools: tools.length > 0 ? tools : undefined,
    // maxTurns controlado via run() options, não Agent constructor
  });
}

/**
 * Executa o agente com mensagens de entrada (modo não-streaming)
 */
export async function runAgent(
  agent: Agent,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<AgentRunResult> {
  // Extrai a última mensagem do usuário
  const userMessage = getLastUserMessage(messages);

  // Executa o agente
  // SDK aceita string (interpretado como mensagem do usuário)
  const result = await run(agent, userMessage);

  return {
    finalOutput: result.finalOutput || '',
    history: result.history || [],
  };
}

/**
 * Executa o agente em modo streaming
 * Retorna o stream do SDK diretamente
 */
export async function runAgentStreaming(
  agent: Agent,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
) {
  // Extrai a última mensagem do usuário
  const userMessage = getLastUserMessage(messages);

  // Executa o agente com streaming habilitado
  const stream = await run(agent, userMessage, { stream: true });

  return stream;
}

/**
 * Retorna informações sobre o agente configurado
 */
export function getAgentInfo(
  agentManifest: AgentManifest,
  modelManifest: ModelManifest,
  toolManifests: ToolManifest[],
  knowledgeManifests: KnowledgeBaseManifest[]
) {
  return {
    id: agentManifest.agent.id,
    name: agentManifest.agent.name,
    description: agentManifest.agent.description,
    version: agentManifest.agent.version,
    team: agentManifest.agent.team,
    model: modelManifest.model.name,
    tools: toolManifests.map((t) => t.tool.name),
    knowledgeBases: knowledgeManifests.map((kb) => kb.knowledge_base.name),
  };
}
