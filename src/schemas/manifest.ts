// src/schemas/manifest.ts
import { z } from 'zod';

/**
 * Schema para configuração de modelo
 */
export const ModelConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
});

/**
 * Schema para definição de modelo
 */
export const ModelSchema = z.object({
  model: z.object({
    id: z.string(),
    name: z.string(),
    provider: z.enum(['openai', 'anthropic', 'local', 'http']),
    description: z.string().optional(),
    config: ModelConfigSchema.optional(),
  }),
});

/**
 * Schema para endpoint HTTP de tool
 */
export const HttpEndpointSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  timeout_ms: z.number().positive().optional(),
  headers: z.record(z.string()).optional(),
});

/**
 * Schema para autenticação de tool
 */
export const AuthSchema = z.object({
  secret: z.string(), // Nome simbólico da secret
}).optional();

/**
 * Schema para políticas de tool
 */
export const PoliciesSchema = z.object({
  retries: z.number().int().min(0).optional(),
  rate_limit_per_min: z.number().int().positive().optional(),
}).optional();

/**
 * Schema para definição de tool
 * parameters deve ser um JSON Schema válido (não validamos a estrutura aqui, apenas que seja object)
 */
export const ToolSchema = z.object({
  tool: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['http', 'shell', 'noop', 'client']),
    description: z.string(),
    endpoint: HttpEndpointSchema.optional(),
    parameters: z.record(z.any()), // JSON Schema object
    auth: AuthSchema,
    policies: PoliciesSchema,
  }),
});

/**
 * Schema para documento inline de knowledge base
 */
export const InlineDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema para fonte de knowledge base
 */
export const KnowledgeSourceSchema = z.object({
  type: z.enum(['inline', 'file', 'url', 'vector_store']),
  documents: z.array(InlineDocumentSchema).optional(),
  path: z.string().optional(),
  url: z.string().url().optional(),
});

/**
 * Schema para processamento de knowledge base
 */
export const ProcessingSchema = z.object({
  chunking: z.object({
    strategy: z.enum(['semantic', 'fixed', 'paragraph']),
    max_tokens: z.number().positive().optional(),
  }).optional(),
}).optional();

/**
 * Schema para knowledge base
 */
export const KnowledgeBaseSchema = z.object({
  knowledge_base: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    sources: z.array(KnowledgeSourceSchema),
    processing: ProcessingSchema,
  }),
});

/**
 * Schema para prompt do agente
 */
export const PromptSchema = z.object({
  system: z.string(),
  user_template: z.string().optional(),
});

/**
 * Schema para runtime config do agente
 */
export const RuntimeSchema = z.object({
  concurrency: z.number().int().positive().optional(),
  max_steps: z.number().int().positive().optional(),
  timeout_ms: z.number().positive().optional(),
}).optional();

/**
 * Schema para turn de conversa em golden conversations
 */
export const ConversationTurnSchema = z.object({
  user: z.string().optional(),
  assistant: z.string().optional(),
});

/**
 * Schema para golden conversation
 */
export const GoldenConversationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  turns: z.array(ConversationTurnSchema),
});

/**
 * Schema para evaluation config do agente
 */
export const EvaluationSchema = z.object({
  golden_conversations: z.array(GoldenConversationSchema).optional(),
}).optional();

/**
 * Schema para definição de agente
 */
export const AgentSchema = z.object({
  agent: z.object({
    id: z.string(),
    name: z.string(),
    team: z.string(),
    owner: z.string().optional(),
    version: z.string(),
    description: z.string().optional(),
    type: z.enum(['conversational', 'task', 'workflow']),

    // Referências por string ID
    model: z.string(), // ID do modelo (ex: "shared/gpt-4o-mini")
    tools: z.array(z.string()).optional(), // Array de IDs de tools
    knowledge: z.array(z.string()).optional(), // Array de IDs de KBs

    prompt: PromptSchema,
    runtime: RuntimeSchema,
    evaluation: EvaluationSchema,
  }),
});

// Tipos TypeScript exportados
export type Model = z.infer<typeof ModelSchema>['model'];
export type Tool = z.infer<typeof ToolSchema>['tool'];
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>['knowledge_base'];
export type Agent = z.infer<typeof AgentSchema>['agent'];

export type ModelManifest = z.infer<typeof ModelSchema>;
export type ToolManifest = z.infer<typeof ToolSchema>;
export type KnowledgeBaseManifest = z.infer<typeof KnowledgeBaseSchema>;
export type AgentManifest = z.infer<typeof AgentSchema>;
