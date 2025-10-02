// src/manifest/validator.ts
import {
  ModelSchema,
  ToolSchema,
  KnowledgeBaseSchema,
  AgentSchema,
  type AgentManifest,
  type ModelManifest,
  type ToolManifest,
  type KnowledgeBaseManifest,
} from '../schemas/manifest.js';
import type { ManifestRegistry } from './loader.js';
import { jsonSchemaToZod } from '../runtime/json-schema-to-zod.js';

/**
 * Valida um manifest de modelo usando Zod
 */
export function validateModel(data: any): ModelManifest {
  return ModelSchema.parse(data);
}

/**
 * Valida um manifest de tool usando Zod
 */
export function validateTool(data: any): ToolManifest {
  return ToolSchema.parse(data);
}

/**
 * Valida um manifest de knowledge base usando Zod
 */
export function validateKnowledgeBase(data: any): KnowledgeBaseManifest {
  return KnowledgeBaseSchema.parse(data);
}

/**
 * Valida um manifest de agente usando Zod
 */
export function validateAgent(data: any): AgentManifest {
  return AgentSchema.parse(data);
}

/**
 * Valida que as referências (model, tools, knowledge) de um agente existem no registry
 */
export function validateAgentReferences(
  agent: AgentManifest,
  registry: ManifestRegistry
): void {
  const errors: string[] = [];

  // Valida referência do modelo
  const modelId = agent.agent.model;
  if (!registry.models.has(modelId)) {
    errors.push(`Model not found: ${modelId}`);
  }

  // Valida referências de tools
  if (agent.agent.tools) {
    for (const toolId of agent.agent.tools) {
      if (!registry.tools.has(toolId)) {
        errors.push(`Tool not found: ${toolId}`);
      }
    }
  }

  // Valida referências de knowledge bases
  if (agent.agent.knowledge) {
    for (const kbId of agent.agent.knowledge) {
      if (!registry.knowledgeBases.has(kbId)) {
        errors.push(`Knowledge base not found: ${kbId}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Agent ${agent.agent.id} has invalid references:\n  - ${errors.join('\n  - ')}`
    );
  }
}

/**
 * Valida que os parameters de uma tool podem ser convertidos para Zod
 * (validação básica, tentando converter JSON Schema → Zod)
 */
export function validateToolParameters(tool: ToolManifest): void {
  try {
    // Tenta converter JSON Schema para Zod
    // Se lançar exceção, o schema é inválido
    jsonSchemaToZod(tool.tool.parameters);
  } catch (error) {
    throw new Error(
      `Tool ${tool.tool.id} has invalid JSON Schema in parameters: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Valida todos os manifests no registry
 */
export function validateRegistry(registry: ManifestRegistry): void {
  const errors: string[] = [];

  // Valida estrutura de cada modelo
  for (const [id, model] of registry.models.entries()) {
    try {
      validateModel(model);
    } catch (error) {
      errors.push(`Model ${id}: ${error}`);
    }
  }

  // Valida estrutura e JSON Schema de cada tool
  for (const [id, tool] of registry.tools.entries()) {
    try {
      validateTool(tool);
      validateToolParameters(tool);
    } catch (error) {
      errors.push(`Tool ${id}: ${error}`);
    }
  }

  // Valida estrutura de cada knowledge base
  for (const [id, kb] of registry.knowledgeBases.entries()) {
    try {
      validateKnowledgeBase(kb);
    } catch (error) {
      errors.push(`Knowledge Base ${id}: ${error}`);
    }
  }

  // Valida estrutura e referências de cada agente
  for (const [id, agent] of registry.agents.entries()) {
    try {
      validateAgent(agent);
      validateAgentReferences(agent, registry);
    } catch (error) {
      errors.push(`Agent ${id}: ${error}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  console.log('✓ All manifests validated successfully');
}
