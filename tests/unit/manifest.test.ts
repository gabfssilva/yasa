// tests/unit/manifest.test.ts
import { describe, it, expect } from 'vitest';
import { loadManifests } from '../../src/manifest/loader.js';
import { validateRegistry } from '../../src/manifest/validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Manifest Loading', () => {
  it('should load all manifests from configuration directory', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    // Verifica que carregou todos os tipos de recursos
    expect(registry.models.size).toBeGreaterThan(0);
    expect(registry.tools.size).toBeGreaterThan(0);
    expect(registry.agents.size).toBeGreaterThan(0);
    expect(registry.knowledgeBases.size).toBeGreaterThan(0);

    // Log para debug
    console.log(`✓ Loaded ${registry.models.size} models`);
    console.log(`✓ Loaded ${registry.tools.size} tools`);
    console.log(`✓ Loaded ${registry.knowledgeBases.size} knowledge bases`);
    console.log(`✓ Loaded ${registry.agents.size} agents`);
  });

  it('should validate all manifests successfully', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    // Validação não deve lançar exceção
    expect(() => validateRegistry(registry)).not.toThrow();
  });

  it('should load support assistant agent with correct references', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    const agent = registry.agents.get('teams/support/assistant');

    expect(agent).toBeDefined();
    expect(agent!.agent.id).toBe('teams/support/assistant');
    expect(agent!.agent.name).toBe('Assistente de Suporte');
    expect(agent!.agent.model).toBe('shared/gpt-4o-mini');
    expect(agent!.agent.tools).toContain('shared/get-ip');
    expect(agent!.agent.knowledge).toContain('shared/kb-faq');
  });

  it('should load weather assistant agent with correct tools', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    const agent = registry.agents.get('teams/weather/weather-assistant');

    expect(agent).toBeDefined();
    expect(agent!.agent.id).toBe('teams/weather/weather-assistant');
    expect(agent!.agent.name).toBe('Assistente do Tempo');
    expect(agent!.agent.tools).toContain('shared/geocode-city');
    expect(agent!.agent.tools).toContain('shared/get-weather');
  });

  it('should load gpt-4o-mini model with correct configuration', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    const model = registry.models.get('shared/gpt-4o-mini');

    expect(model).toBeDefined();
    expect(model!.model.provider).toBe('openai');
    expect(model!.model.config?.temperature).toBe(0.7);
    expect(model!.model.config?.max_tokens).toBe(2048);
  });

  it('should load tools with valid JSON Schema parameters', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    const getIpTool = registry.tools.get('shared/get-ip');
    const getWeatherTool = registry.tools.get('shared/get-weather');

    expect(getIpTool).toBeDefined();
    expect(getIpTool!.tool.type).toBe('http');
    expect(getIpTool!.tool.parameters).toBeDefined();

    expect(getWeatherTool).toBeDefined();
    expect(getWeatherTool!.tool.parameters.properties).toHaveProperty('latitude');
    expect(getWeatherTool!.tool.parameters.properties).toHaveProperty('longitude');
  });

  it('should load knowledge base with inline documents', async () => {
    const configPath = path.join(__dirname, '../../configuration');
    const registry = await loadManifests(configPath);

    const kb = registry.knowledgeBases.get('shared/kb-faq');

    expect(kb).toBeDefined();
    expect(kb!.knowledge_base.sources).toHaveLength(1);
    expect(kb!.knowledge_base.sources[0].type).toBe('inline');
    expect(kb!.knowledge_base.sources[0].documents).toBeDefined();
    expect(kb!.knowledge_base.sources[0].documents!.length).toBeGreaterThan(0);
  });
});
