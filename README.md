# YASA - Yet Another Agent System

**Milestone 1**: Agent-as-YAML + OpenAI-compatible API

YASA permite declarar agentes via YAML e expô-los através de uma API compatível com OpenAI, incluindo suporte a tools, models e knowledge bases.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                  Configuration (YAML)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Models  │  │  Tools   │  │Knowledge │  │ Agents  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Manifest Loader + Validator                │
│             (Zod + JSON Schema + Ajv)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Agent Runtime                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  OpenAI SDK + Tool Executor + Knowledge Context   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│           Fastify Server (OpenAI-compatible)            │
│  GET  /v1/models                                        │
│  GET  /v1/models/:modelId                               │
│  POST /v1/chat/completions                              │
└─────────────────────────────────────────────────────────┘
```

## Estrutura de Diretórios

```
yasa/
├── configuration/              # Configurações YAML (one-file-per-resource)
│   ├── shared/
│   │   ├── models/
│   │   │   └── gpt-4o-mini.yaml
│   │   ├── tools/
│   │   │   └── get-ip.yaml
│   │   └── knowledge/
│   │       └── faq.yaml
│   └── teams/
│       └── support/
│           └── agents/
│               └── assistant.yaml
├── src/
│   ├── schemas/
│   │   └── manifest.ts         # Zod schemas
│   ├── manifest/
│   │   ├── loader.ts           # YAML loader
│   │   └── validator.ts        # Validation (Zod + Ajv)
│   ├── runtime/
│   │   ├── agent.ts            # Agent runtime (OpenAI SDK)
│   │   ├── tools.ts            # Tool executor
│   │   └── knowledge.ts        # Knowledge base loader
│   └── server/
│       ├── index.ts            # Fastify server
│       └── routes/
│           └── chat.ts         # OpenAI-compatible routes
├── scripts/
│   └── validate-yaml.mjs       # YAML syntax validator
├── package.json
├── tsconfig.json
└── README.md
```

## Princípios de Design

### 1. One-file-per-resource
Cada recurso (model, tool, knowledge base, agent) vive em seu próprio arquivo YAML.

### 2. Referências por String ID
Agentes referenciam models e tools usando IDs em formato string:
```yaml
agent:
  model: "shared/gpt-4o-mini"          # não modelRef
  tools:                               # não toolRefs
    - "shared/get-ip"
```

### 3. JSON Schema para Tool Parameters
Tools declaram `parameters` usando JSON Schema (draft-07):
```yaml
tool:
  parameters:
    $schema: "http://json-schema.org/draft-07/schema#"
    type: object
    properties:
      invoice_id:
        type: string
```

### 4. Secrets Simbólicos
Nunca coloque secrets inline. Use nomes simbólicos:
```yaml
tool:
  auth:
    secret: "payments_api_key"  # Runtime resolve de env var
```

## Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd yasa

# Instale dependências
npm install

# Configure a API key do OpenAI
export OPENAI_API_KEY="sk-..."
```

## Uso

### 1. Validar YAMLs

```bash
# Validar todos os YAMLs
npm run validate

# Validar arquivo específico
npm run validate:file configuration/teams/support/agents/assistant.yaml
```

### 2. Iniciar o servidor (development)

```bash
npm run dev
```

Servidor inicia em `http://localhost:3000`

### 3. Build para produção

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Listar Agentes
```bash
curl http://localhost:3000/v1/agents
```

Response:
```json
{
  "agents": [
    {
      "id": "teams/support/assistant",
      "name": "Assistente de Suporte",
      "team": "support",
      "description": "Agente para atendimento e suporte básico",
      "version": "0.1.0"
    }
  ]
}
```

### Info do Agente
```bash
curl http://localhost:3000/v1/agents/teams/support/assistant/info
```

Response:
```json
{
  "id": "teams/support/assistant",
  "name": "Assistente de Suporte",
  "description": "Agente para atendimento e suporte básico",
  "version": "0.1.0",
  "team": "support",
  "model": "gpt-4o-mini",
  "tools": ["get_public_ip"],
  "knowledgeBases": ["FAQ básico - Suporte"]
}
```

### Chat Completions (OpenAI-compatible)
```bash
curl -X POST http://localhost:3000/v1/agents/teams/support/assistant/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Qual o horário de atendimento?"}
    ]
  }'
```

Response (formato OpenAI):
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "teams/support/assistant",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Nosso atendimento funciona de segunda a sexta-feira, das 9h às 18h (horário de Brasília)."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 45,
    "total_tokens": 168
  }
}
```

### Exemplo com Tool Calling
```bash
curl -X POST http://localhost:3000/v1/agents/teams/support/assistant/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Qual meu IP público?"}
    ]
  }'
```

O agente automaticamente:
1. Chama a tool `get_public_ip`
2. Recebe o resultado (`{"ip": "203.0.113.45"}`)
3. Retorna resposta formatada ao usuário

## Exemplos de Configuração YAML

### Model
```yaml
# configuration/shared/models/gpt-4o-mini.yaml
model:
  id: "shared/gpt-4o-mini"
  name: "gpt-4o-mini"
  provider: "openai"
  description: "Modelo leve para tarefas de baixa-latência"
  config:
    temperature: 0.7
    max_tokens: 2048
```

### Tool
```yaml
# configuration/shared/tools/get-ip.yaml
tool:
  id: "shared/get-ip"
  name: "get_public_ip"
  type: "http"
  description: "Obtém o IP público atual"
  endpoint:
    url: "https://api.ipify.org?format=json"
    method: "GET"
    timeout_ms: 3000
  parameters:
    $schema: "http://json-schema.org/draft-07/schema#"
    type: object
    properties: {}
    required: []
```

### Knowledge Base
```yaml
# configuration/shared/knowledge/faq.yaml
knowledge_base:
  id: "shared/kb-faq"
  name: "FAQ básico"
  sources:
    - type: "inline"
      documents:
        - title: "Horário de atendimento"
          content: |
            Atendemos de segunda a sexta-feira, das 9h às 18h.
```

### Agent
```yaml
# configuration/teams/support/agents/assistant.yaml
agent:
  id: "teams/support/assistant"
  name: "Assistente de Suporte"
  team: "support"
  version: "0.1.0"
  type: "conversational"

  # Referências por string ID
  model: "shared/gpt-4o-mini"
  tools:
    - "shared/get-ip"
  knowledge:
    - "shared/kb-faq"

  prompt:
    system: |
      Você é o Assistente de Suporte.
      Use a base de conhecimento para responder perguntas frequentes.

  runtime:
    max_steps: 10
```

## Validação

O sistema possui múltiplas camadas de validação:

### 1. Sintaxe YAML
```bash
npm run validate
```

### 2. Estrutura com Zod
- Valida schema de cada manifest
- Garante campos obrigatórios
- Valida tipos e enums

### 3. Referências
- Verifica se `agent.model` existe em `shared/models/`
- Verifica se `agent.tools[]` existem em `shared/tools/`
- Verifica se `agent.knowledge[]` existem em `shared/knowledge/`

### 4. JSON Schema (Tools)
- Valida que `tool.parameters` é JSON Schema válido
- Valida argumentos de tool calls em runtime usando Ajv

## Próximos Passos (Milestone 2)

- [ ] Thread management (stateful conversations)
- [ ] Streaming responses
- [ ] Vector store integration para knowledge bases
- [ ] Authentication & rate limiting
- [ ] Métricas e observability
- [ ] Testes automatizados com Vitest
- [ ] CI/CD pipeline

## Testes Rápidos

```bash
# 1. Validar YAMLs
npm run validate

# 2. Iniciar servidor
npm run dev

# 3. Em outro terminal, testar endpoints
curl http://localhost:3000/health
curl http://localhost:3000/v1/agents

# 4. Testar chat (requer OPENAI_API_KEY)
curl -X POST http://localhost:3000/v1/agents/teams/support/assistant/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Oi, tudo bem?"}]}'
```

## Critérios de Aceitação ✓

- [x] Arquivos YAML existem nos caminhos especificados
- [x] Cada YAML parseia sem erro
- [x] `assistant.yaml` referencia model e tools por string ID
- [x] `get-ip.yaml` usa JSON Schema draft-07 em `parameters`
- [x] Servidor Fastify expõe endpoints OpenAI-compatible
- [x] Tool executor valida argumentos com Ajv
- [x] README documenta API e exemplos

## Licença

ISC
