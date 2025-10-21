// tests/integration/agents.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { loadManifests } from '../../src/manifest/loader.js';
import { createAgentFromManifests, runAgent } from '../../src/runtime/agent.js';
import type { ManifestRegistry } from '../../src/manifest/loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Skip integration tests if no API key is available
// Note: These tests require network access to OpenAI API or GitHub Models
// They will run in GitHub Actions but may fail in sandboxed environments
const hasApiKey = !!process.env.OPENAI_API_KEY;
const describeOrSkip = hasApiKey ? describe : describe.skip;

if (!hasApiKey) {
  console.log('⏭️  Skipping integration tests: OPENAI_API_KEY not set');
}

describeOrSkip('Support Assistant Agent (Integration with LLM)', () => {
  let registry: ManifestRegistry;

  beforeAll(async () => {
    const configPath = path.join(__dirname, '../../configuration');
    registry = await loadManifests(configPath);
  });

  it('should answer FAQ question using knowledge base', async () => {
    // Arrange: Setup agent
    const agentManifest = registry.agents.get('teams/support/assistant');
    expect(agentManifest).toBeDefined();

    const modelManifest = registry.models.get(agentManifest!.agent.model);
    expect(modelManifest).toBeDefined();

    // Carregar knowledge base
    const kbManifests = (agentManifest!.agent.knowledge || [])
      .map((kbId) => registry.knowledgeBases.get(kbId))
      .filter((kb): kb is NonNullable<typeof kb> => kb !== undefined);

    expect(kbManifests.length).toBeGreaterThan(0);

    // Criar agent SEM tools (para evitar HTTP calls externos neste teste)
    const agent = createAgentFromManifests(
      agentManifest!,
      modelManifest!,
      [], // Sem tools neste teste
      kbManifests
    );

    console.log('\n🤖 Testing Support Agent with question about business hours...');

    // Act: Fazer pergunta sobre horário (está na KB)
    const result = await runAgent(agent, [
      { role: 'user', content: 'Qual o horário de atendimento?' },
    ]);

    console.log(`✓ Agent response: "${result.finalOutput.substring(0, 100)}..."`);

    // Assert: Validar resposta
    expect(result.finalOutput).toBeDefined();
    expect(result.finalOutput.length).toBeGreaterThan(0);

    // Verificar que mencionou informação da KB
    // A KB diz: "Atendemos de segunda a sexta-feira, das 9h às 18h"
    const output = result.finalOutput.toLowerCase();
    const mentionsSchedule =
      output.includes('segunda') ||
      output.includes('sexta') ||
      output.includes('9') ||
      output.includes('18') ||
      output.includes('atendimento');

    expect(mentionsSchedule).toBe(true);
  }, 30000); // 30s timeout para LLM

  it('should provide helpful response to general support question', async () => {
    const agentManifest = registry.agents.get('teams/support/assistant');
    const modelManifest = registry.models.get(agentManifest!.agent.model);
    const kbManifests = (agentManifest!.agent.knowledge || [])
      .map((kbId) => registry.knowledgeBases.get(kbId))
      .filter((kb): kb is NonNullable<typeof kb> => kb !== undefined);

    const agent = createAgentFromManifests(
      agentManifest!,
      modelManifest!,
      [],
      kbManifests
    );

    console.log('\n🤖 Testing Support Agent with greeting...');

    const result = await runAgent(agent, [
      { role: 'user', content: 'Olá, tudo bem?' },
    ]);

    console.log(`✓ Agent response: "${result.finalOutput.substring(0, 100)}..."`);

    expect(result.finalOutput).toBeDefined();
    expect(result.finalOutput.length).toBeGreaterThan(0);

    // Deve ser uma resposta cordial
    expect(result.finalOutput.length).toBeGreaterThan(10);
  }, 30000);
});

describeOrSkip('Weather Assistant Agent (Integration with LLM)', () => {
  let registry: ManifestRegistry;

  beforeAll(async () => {
    const configPath = path.join(__dirname, '../../configuration');
    registry = await loadManifests(configPath);
  });

  it('should acknowledge weather request even without tools', async () => {
    const agentManifest = registry.agents.get('teams/weather/weather-assistant');
    expect(agentManifest).toBeDefined();

    const modelManifest = registry.models.get(agentManifest!.agent.model);
    expect(modelManifest).toBeDefined();

    // Criar agent SEM tools (vai explicar que precisa das tools)
    const agent = createAgentFromManifests(
      agentManifest!,
      modelManifest!,
      [], // Sem tools
      []
    );

    console.log('\n🌤️  Testing Weather Agent without tools...');

    const result = await runAgent(agent, [
      { role: 'user', content: 'Qual o clima em São Paulo?' },
    ]);

    console.log(`✓ Agent response: "${result.finalOutput.substring(0, 100)}..."`);

    expect(result.finalOutput).toBeDefined();
    expect(result.finalOutput.length).toBeGreaterThan(0);

    // O agente deve mencionar que não conseguiu ou pedir desculpas
    // ou tentar ajudar de alguma forma
    expect(result.finalOutput.length).toBeGreaterThan(10);
  }, 30000);
});
