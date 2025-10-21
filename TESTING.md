# YASA Testing Guide

## ✅ O que foi implementado

### Estrutura de Testes

```
tests/
├── unit/                    # ✅ Testes unitários (sem LLM)
│   └── manifest.test.ts     # 7 testes de manifests
├── integration/             # ✅ Testes de integração (com LLM)
│   └── agents.test.ts       # 3 testes de agentes
└── helpers/                 # ✅ Utilitários
    └── mock-tools.ts        # Mocks de tools
```

### Configurações

- ✅ `vitest.config.ts` - Configuração do Vitest com TypeScript
- ✅ `.github/workflows/test.yml` - CI/CD com GitHub Actions
- ✅ `package.json` - Scripts de teste
- ✅ `tests/README.md` - Documentação de testes

---

## 🚀 Como Usar

### 1. Testes Unitários (Rápido, Offline)

```bash
npm run test:unit
```

**O que testa:**
- ✅ Carregamento de 1 modelo, 3 tools, 1 KB, 2 agentes
- ✅ Validação de estrutura com Zod
- ✅ Referências entre recursos (agent → model, tools, KB)
- ✅ JSON Schema de tools
- ✅ Knowledge base com documentos inline

**Resultado esperado:**
```
✓ tests/unit/manifest.test.ts (7 tests) 93ms
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### 2. Testes de Integração (Com LLM Real)

#### Opção A: GitHub Models (Grátis, Recomendado)

```bash
# 1. Criar Personal Access Token
# https://github.com/settings/tokens/new
# Scope: models:read

# 2. Configurar ambiente
export OPENAI_BASE_URL=https://models.github.ai/inference
export OPENAI_API_KEY=github_pat_SEU_TOKEN

# 3. Rodar testes
npm run test:integration
```

#### Opção B: OpenAI Direto (Pago)

```bash
export OPENAI_API_KEY=sk-...
npm run test:integration
```

**O que testa:**
- ✅ Support Agent responde pergunta sobre FAQ (usando KB)
- ✅ Support Agent responde saudação
- ✅ Weather Agent reconhece solicitação (sem tools)

**Resultado esperado:**
```
🤖 Testing Support Agent with question about business hours...
✓ Agent response: "Nosso atendimento funciona de segunda a sexta..."

✓ tests/integration/agents.test.ts (3 tests) 15s
```

### 3. Todos os Testes

```bash
npm test
```

### 4. Modo Watch (Desenvolvimento)

```bash
npm run test:watch
```

---

## 🔧 GitHub Actions

### Workflow Automático

O arquivo `.github/workflows/test.yml` executa:

1. **Unit Tests** (sempre)
   - Valida YAMLs
   - Roda testes unitários
   - Sem custo, sem rate limits

2. **Integration Tests** (com GitHub Models)
   - Usa `GITHUB_TOKEN` automático
   - Permissão: `models: read`
   - Grátis para repos públicos/OSS

### Como funciona no CI

```yaml
permissions:
  contents: read
  models: read  # ← Acesso ao GitHub Models

env:
  OPENAI_BASE_URL: https://models.github.ai/inference
  OPENAI_API_KEY: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📊 Cobertura Atual

### Testes Unitários (7 testes)

| Teste | Status |
|-------|--------|
| Carregamento de manifests | ✅ |
| Validação completa | ✅ |
| Support Agent referências | ✅ |
| Weather Agent tools | ✅ |
| Modelo GPT-4o-mini config | ✅ |
| Tools com JSON Schema | ✅ |
| Knowledge base inline | ✅ |

### Testes de Integração (3 testes)

| Teste | Status |
|-------|--------|
| Support Agent + KB (FAQ) | ✅ |
| Support Agent + Greeting | ✅ |
| Weather Agent sem tools | ✅ |

---

## 🎯 Próximos Passos

### Milestone 1.2 (Sugerido)

- [ ] Teste de Support Agent COM tool (get_public_ip usando mock)
- [ ] Teste de Weather Agent COM tools mockadas (geocode + weather)
- [ ] Teste de validação de streaming responses
- [ ] Teste de error handling (modelo inexistente, tool falha)

### Milestone 2

- [ ] Testes de golden conversations (já definidas nos YAMLs)
- [ ] Testes de performance (latência, throughput)
- [ ] Testes de rate limiting
- [ ] Testes de authentication
- [ ] Coverage > 80%

---

## 🔍 Exemplos de Uso

### Criar Novo Teste Unitário

```typescript
// tests/unit/meu-teste.test.ts
import { describe, it, expect } from 'vitest';

describe('Minha Feature', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Criar Teste de Integração com Mock

```typescript
// tests/integration/weather-with-mocks.test.ts
import { createMockTools } from '../helpers/mock-tools';

const mockTools = createMockTools(toolManifests);
const agent = createAgentFromManifests(
  agentManifest,
  modelManifest,
  mockTools,  // ← Usa mocks ao invés de tools reais
  kbManifests
);
```

---

## 🐛 Troubleshooting

### Erro: "vitest: not found"

```bash
npm install
```

### Erro: "Model not found" (GitHub Models)

1. Verifique se o token tem scope `models:read`
2. Confirme que o modelo existe: https://github.com/marketplace/models
3. Use `gpt-4o-mini` (modelo disponível gratuitamente)

### Timeout nos testes

Aumente o timeout:

```typescript
it('test', async () => {
  // ...
}, 60000); // 60 segundos
```

### Rate Limit (GitHub Models)

- Aguarde alguns minutos
- Use `npm run test:unit` durante desenvolvimento
- Execute integration tests espaçadamente

---

## 📈 Benefícios Desta Abordagem

1. **Custo Zero**: Testes gratuitos com GitHub Models
2. **Rápido Feedback**: Unit tests em < 1s
3. **Real Validation**: Integration tests usam LLM de verdade
4. **CI/CD Ready**: Funciona no GitHub Actions automaticamente
5. **Sem Vendor Lock-in**: Troca fácil de provider (só mudar env vars)
6. **Documentação Viva**: Testes servem como exemplos

---

## 🎓 Recursos

- **Vitest Docs**: https://vitest.dev/
- **GitHub Models**: https://github.com/marketplace/models
- **OpenAI Agents SDK**: https://github.com/openai/openai-node
- **Tests README**: `tests/README.md`

---

## ✨ Resumo Executivo

- ✅ **10 testes implementados** (7 unit + 3 integration)
- ✅ **100% passando** localmente
- ✅ **GitHub Actions configurado** com GitHub Models
- ✅ **Zero custo** para rodar testes
- ✅ **Pronto para expandir** com mais cenários

**Próximo passo**: Commit e push para ver os testes rodando no CI! 🚀
