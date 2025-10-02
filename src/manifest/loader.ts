// src/manifest/loader.ts
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import type {
  ModelManifest,
  ToolManifest,
  KnowledgeBaseManifest,
  AgentManifest,
} from '../schemas/manifest.js';

/**
 * Registry que armazena todos os recursos carregados
 */
export interface ManifestRegistry {
  models: Map<string, ModelManifest>;
  tools: Map<string, ToolManifest>;
  knowledgeBases: Map<string, KnowledgeBaseManifest>;
  agents: Map<string, AgentManifest>;
}

/**
 * Carrega e parseia um arquivo YAML
 */
function loadYamlFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf8');
  return YAML.parse(content);
}

/**
 * Carrega recursivamente todos os arquivos YAML de um diretório
 */
function loadYamlFilesRecursively(dir: string): any[] {
  const results: any[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...loadYamlFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      try {
        const data = loadYamlFile(fullPath);
        results.push({ filePath: fullPath, data });
      } catch (error) {
        console.error(`Error loading ${fullPath}:`, error);
        throw error;
      }
    }
  }

  return results;
}

/**
 * Determina o tipo de manifest baseado nas chaves presentes
 */
function detectManifestType(data: any): 'model' | 'tool' | 'knowledge_base' | 'agent' | 'unknown' {
  if (data.model) return 'model';
  if (data.tool) return 'tool';
  if (data.knowledge_base) return 'knowledge_base';
  if (data.agent) return 'agent';
  return 'unknown';
}

/**
 * Carrega todos os manifests do diretório de configuração
 */
export async function loadManifests(configDir: string): Promise<ManifestRegistry> {
  const registry: ManifestRegistry = {
    models: new Map(),
    tools: new Map(),
    knowledgeBases: new Map(),
    agents: new Map(),
  };

  // Carrega todos os YAMLs recursivamente
  const files = loadYamlFilesRecursively(configDir);

  // Categoriza e indexa por ID
  for (const { filePath, data } of files) {
    const type = detectManifestType(data);

    switch (type) {
      case 'model': {
        const manifest = data as ModelManifest;
        const id = manifest.model.id;
        if (registry.models.has(id)) {
          throw new Error(`Duplicate model ID: ${id} (found in ${filePath})`);
        }
        registry.models.set(id, manifest);
        break;
      }

      case 'tool': {
        const manifest = data as ToolManifest;
        const id = manifest.tool.id;
        if (registry.tools.has(id)) {
          throw new Error(`Duplicate tool ID: ${id} (found in ${filePath})`);
        }
        registry.tools.set(id, manifest);
        break;
      }

      case 'knowledge_base': {
        const manifest = data as KnowledgeBaseManifest;
        const id = manifest.knowledge_base.id;
        if (registry.knowledgeBases.has(id)) {
          throw new Error(`Duplicate knowledge base ID: ${id} (found in ${filePath})`);
        }
        registry.knowledgeBases.set(id, manifest);
        break;
      }

      case 'agent': {
        const manifest = data as AgentManifest;
        const id = manifest.agent.id;
        if (registry.agents.has(id)) {
          throw new Error(`Duplicate agent ID: ${id} (found in ${filePath})`);
        }
        registry.agents.set(id, manifest);
        break;
      }

      case 'unknown':
        console.warn(`Unknown manifest type in file: ${filePath}`);
        break;
    }
  }

  console.log(`Loaded manifests:
  - Models: ${registry.models.size}
  - Tools: ${registry.tools.size}
  - Knowledge Bases: ${registry.knowledgeBases.size}
  - Agents: ${registry.agents.size}`);

  return registry;
}

/**
 * Busca um agente por ID no registry
 */
export function getAgent(registry: ManifestRegistry, agentId: string): AgentManifest | undefined {
  return registry.agents.get(agentId);
}

/**
 * Busca um modelo por ID no registry
 */
export function getModel(registry: ManifestRegistry, modelId: string): ModelManifest | undefined {
  return registry.models.get(modelId);
}

/**
 * Busca uma tool por ID no registry
 */
export function getTool(registry: ManifestRegistry, toolId: string): ToolManifest | undefined {
  return registry.tools.get(toolId);
}

/**
 * Busca uma knowledge base por ID no registry
 */
export function getKnowledgeBase(
  registry: ManifestRegistry,
  kbId: string
): KnowledgeBaseManifest | undefined {
  return registry.knowledgeBases.get(kbId);
}
