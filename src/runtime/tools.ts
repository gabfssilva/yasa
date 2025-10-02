// src/runtime/tools.ts
import { tool } from '@openai/agents';
import type { ToolManifest } from '../schemas/manifest.js';
import { jsonSchemaToZod } from './json-schema-to-zod.js';

/**
 * Resolve secret do ambiente
 * Em produção, usar um secret manager
 */
function resolveSecret(secretName: string): string | undefined {
  const envVar = secretName.toUpperCase();
  return process.env[envVar];
}

/**
 * Executa requisição HTTP
 */
async function executeHttpRequest(
  endpoint: any,
  args: any,
  auth?: { secret: string }
): Promise<any> {
  const { url, method, timeout_ms = 5000, headers = {} } = endpoint;

  // Resolve autenticação se configurada
  if (auth?.secret) {
    const secretValue = resolveSecret(auth.secret);
    if (secretValue) {
      headers['Authorization'] = `Bearer ${secretValue}`;
    }
  }

  // Prepara a requisição
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: AbortSignal.timeout(timeout_ms),
  };

  // Adiciona body para métodos que aceitam
  if (method !== 'GET' && method !== 'HEAD' && Object.keys(args).length > 0) {
    requestOptions.body = JSON.stringify(args);
  }

  // Adiciona query params para GET
  let finalUrl = url;
  if (method === 'GET' && Object.keys(args).length > 0) {
    const params = new URLSearchParams(args);
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}${params.toString()}`;
  }

  const response = await fetch(finalUrl, requestOptions);
    console.log(response)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Tenta parsear JSON, senão retorna texto
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

/**
 * Cria uma tool do OpenAI Agents SDK a partir de um manifest YAML
 */
export function createToolFromManifest(toolManifest: ToolManifest) {
  const { name, description, parameters, type, endpoint, auth } = toolManifest.tool;

  // Converte JSON Schema para Zod
  const zodParameters = jsonSchemaToZod(parameters);

  // Define a função execute baseada no tipo
  let executeFunction: (args: any) => Promise<any>;

  switch (type) {
    case 'http': {
      if (!endpoint) {
        throw new Error(`HTTP tool ${name} requires endpoint configuration`);
      }

      executeFunction = async (args: any) => {
        return await executeHttpRequest(endpoint, args, auth);
      };
      break;
    }

    case 'noop': {
      executeFunction = async (args: any) => {
        return { message: 'Noop tool executed', args };
      };
      break;
    }

    case 'shell':
    case 'client':
      throw new Error(`Tool type ${type} not implemented yet`);

    default:
      throw new Error(`Unknown tool type: ${type}`);
  }

  // Cria e retorna a tool usando o SDK
  return tool({
    name,
    description,
    parameters: zodParameters,
    execute: executeFunction,
  });
}

/**
 * Cria múltiplas tools a partir de manifests
 */
export function createToolsFromManifests(toolManifests: ToolManifest[]) {
  return toolManifests.map(createToolFromManifest);
}
