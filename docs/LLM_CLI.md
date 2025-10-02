# Usando YASA com LLM CLI

YASA é 100% compatível com o [LLM CLI](https://llm.datasette.io/) de Simon Willison.

## Instalação do LLM CLI

```bash
pip install llm
# ou
brew install llm
```

## Configuração

### 1. Encontrar o diretório de configuração

```bash
llm keys path
```

Isso mostra o caminho para `keys.json`. Você criará o arquivo de configuração no mesmo diretório.

**Caminhos comuns:**
- macOS: `~/Library/Application Support/io.datasette.llm/`
- Linux: `~/.config/io.datasette.llm/`

### 2. Criar arquivo de configuração

Crie o arquivo `extra-openai-models.yaml` no diretório acima:

```yaml
- model_id: teams/support/assistant
  model_name: teams/support/assistant
  api_base: "http://localhost:3000"
  supports_tools: true
  can_stream: true
```

**Parâmetros:**
- `model_id`: Nome que você usa no CLI (igual ao `model_name`)
- `model_name`: ID do agente YASA (ex: `teams/support/assistant`)
- `api_base`: URL do servidor YASA (sem `/v1`)
- `supports_tools`: `true` para agentes com tools
- `can_stream`: `true` para habilitar streaming

### 3. Verificar configuração

```bash
llm models
```

Deve listar `teams/support/assistant` entre os modelos disponíveis.

## Uso

### Comando básico

```bash
llm -m teams/support/assistant "Qual é meu IP público?"
```

### Com streaming

```bash
llm -m teams/support/assistant "Explique o que é YASA" --stream
```

### Modo chat interativo

```bash
llm chat -m teams/support/assistant
```

### Salvar conversa

```bash
llm -m teams/support/assistant "Olá" --save chat1
llm -c chat1 "Qual meu IP?"
```

## Múltiplos agentes

Para adicionar mais agentes, adicione mais entradas no `extra-openai-models.yaml`:

```yaml
- model_id: teams/support/assistant
  model_name: teams/support/assistant
  api_base: "http://localhost:3000"
  supports_tools: true
  can_stream: true

- model_id: teams/sales/assistant
  model_name: teams/sales/assistant
  api_base: "http://localhost:3000"
  supports_tools: true
  can_stream: true

- model_id: teams/engineering/assistant
  model_name: teams/engineering/assistant
  api_base: "http://localhost:3000"
  supports_tools: true
  can_stream: true
```

Uso:

```bash
llm -m teams/support/assistant "Suporte: qual meu IP?"
llm -m teams/sales/assistant "Vendas: preciso de cotação"
llm -m teams/engineering/assistant "Engenharia: bug no sistema"
```

## Listar modelos disponíveis

Para ver todos os agentes YASA disponíveis:

```bash
curl http://localhost:3000/v1/models | jq '.data[].id'
```

## Exemplos avançados

### System prompt customizado

```bash
llm -m teams/support/assistant -s "Você é um assistente muito formal" "Como está o tempo?"
```

### Temperatura customizada

```bash
llm -m teams/support/assistant -o temperature 0.9 "Seja criativo: invente uma história"
```

### Modo continuar conversa

```bash
llm -m teams/support/assistant "Olá" --save mysession
llm --continue mysession "Qual meu IP?"
llm -c mysession "Obrigado!"
```

## Troubleshooting

### Modelo não aparece

```bash
# Verificar se o arquivo foi criado no local correto
llm keys path

# Listar modelos configurados
llm models --options
```

### Erro de conexão

Verifique se o servidor YASA está rodando:

```bash
curl http://localhost:3000/health
```

### Ver logs detalhados

```bash
llm -m teams/support/assistant "teste" --log debug
```

## Referências

- [LLM CLI Documentation](https://llm.datasette.io/)
- [YASA API Reference](../README.md)
