# YASA Tests

Este diretório contém os testes do YASA.

## Estrutura

```
tests/
├── unit/                    # Testes unitários (rápidos, sem LLM)
│   └── manifest.test.ts     # Teste de carregamento de manifests
├── integration/             # Testes de integração (com LLM)
│   └── agents.test.ts       # Teste dos agentes com GitHub Models
└── helpers/                 # Utilidades de teste
    └── mock-tools.ts        # Mock de tools HTTP
```

## Executar Testes

### Testes Unitários (Rápido, Offline)

```bash
npm run test:unit
```

Estes testes:
- ✅ Não fazem chamadas LLM
- ✅ Rodam em < 5 segundos
- ✅ Validam carregamento e estrutura de manifests
- ✅ Não precisam de OPENAI_API_KEY

### Testes de Integração (Com LLM)

**Opção 1: Usar GitHub Models (Recomendado para CI/CD)**

```bash
# 1. Criar Personal Access Token com scope 'models:read'
# https://github.com/settings/tokens/new

# 2. Configurar variáveis de ambiente
export OPENAI_BASE_URL=https://models.github.ai/inference
export OPENAI_API_KEY=github_pat_SEU_TOKEN_AQUI

# 3. Rodar testes
npm run test:integration
```

**Opção 2: Usar OpenAI diretamente**

```bash
# 1. Configurar API key
export OPENAI_API_KEY=sk-...

# 2. Rodar testes (sem definir OPENAI_BASE_URL)
npm run test:integration
```

### Todos os Testes

```bash
npm test
```

### Modo Watch (Desenvolvimento)

```bash
npm run test:watch
```

## GitHub Actions

Os testes rodam automaticamente no GitHub Actions:

- **Unit Tests**: Sempre executam (sem custo)
- **Integration Tests**: Usam GitHub Models gratuitamente via `GITHUB_TOKEN`

Configuração: `.github/workflows/test.yml`

## Escrevendo Novos Testes

### Teste Unitário

```typescript
// tests/unit/meu-teste.test.ts
import { describe, it, expect } from 'vitest';

describe('Minha Feature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

### Teste de Integração

```typescript
// tests/integration/meu-teste.test.ts
import { describe, it, expect } from 'vitest';
import { runAgent } from '@/runtime/agent';

describe('Meu Agente', () => {
  it('should respond to question', async () => {
    // ... setup agent
    const result = await runAgent(agent, messages);
    expect(result.finalOutput).toBeDefined();
  }, 30000); // timeout de 30s
});
```

## Helpers Disponíveis

### Mock de Tools

```typescript
import { createMockTools, mockGetPublicIpTool } from '../helpers/mock-tools';

// Mocka todas as tools automaticamente
const mockTools = createMockTools(toolManifests);

// Ou cria um mock específico
const mockTool = mockGetPublicIpTool();
```

## Troubleshooting

### Erro: "Model not found"

Se você estiver usando GitHub Models, certifique-se de:
- Ter permissão `models:read` no token
- Usar modelos disponíveis (ex: gpt-4o-mini)
- Verificar se o modelo existe: https://github.com/marketplace/models

### Timeout nos testes

Testes de integração podem demorar. Ajuste o timeout:

```typescript
it('test', async () => {
  // ...
}, 60000); // 60 segundos
```

### Rate Limits

GitHub Models tem rate limits. Se atingir, aguarde alguns minutos ou:
- Use apenas testes unitários durante desenvolvimento
- Execute testes de integração espaçadamente
