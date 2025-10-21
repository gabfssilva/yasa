// tests/helpers/mock-tools.ts
import { tool } from '@openai/agents';
import { z } from 'zod';
import type { ToolManifest } from '../../src/schemas/manifest.js';

/**
 * Mock response para get_public_ip
 */
export const MOCK_PUBLIC_IP = '203.0.113.45';

/**
 * Mock response para geocode_city
 */
export const MOCK_GEOCODE_SAO_PAULO = {
  results: [
    {
      name: 'São Paulo',
      country: 'Brazil',
      latitude: -23.5505,
      longitude: -46.6333,
    },
  ],
};

/**
 * Mock response para get_weather
 */
export const MOCK_WEATHER_DATA = {
  current: {
    temperature_2m: 22.5,
    relative_humidity_2m: 65,
    precipitation: 0,
    weather_code: 1,
    wind_speed_10m: 12.5,
    wind_direction_10m: 180,
  },
};

/**
 * Cria uma versão mockada de get_public_ip
 */
export const mockGetPublicIpTool = () => {
  return tool({
    name: 'get_public_ip',
    description: 'Obtém o IP público atual',
    parameters: z.object({}),
    execute: async () => {
      console.log('  [MOCK] get_public_ip called');
      return { ip: MOCK_PUBLIC_IP };
    },
  });
};

/**
 * Cria uma versão mockada de geocode_city
 */
export const mockGeocodeCityTool = () => {
  return tool({
    name: 'geocode_city',
    description: 'Geocodifica uma cidade para obter latitude e longitude',
    parameters: z.object({
      name: z.string().describe('Nome da cidade'),
    }),
    execute: async (args: { name: string }) => {
      console.log(`  [MOCK] geocode_city called with: ${args.name}`);
      return MOCK_GEOCODE_SAO_PAULO;
    },
  });
};

/**
 * Cria uma versão mockada de get_weather
 */
export const mockGetWeatherTool = () => {
  return tool({
    name: 'get_weather',
    description: 'Busca dados climáticos atuais para uma localização',
    parameters: z.object({
      latitude: z.number().describe('Latitude da localização'),
      longitude: z.number().describe('Longitude da localização'),
    }),
    execute: async (args: { latitude: number; longitude: number }) => {
      console.log(
        `  [MOCK] get_weather called with lat=${args.latitude}, lon=${args.longitude}`
      );
      return MOCK_WEATHER_DATA;
    },
  });
};

/**
 * Mapeamento de nomes de tools para suas versões mockadas
 */
const TOOL_MOCKS: Record<string, () => any> = {
  get_public_ip: mockGetPublicIpTool,
  geocode_city: mockGeocodeCityTool,
  get_weather: mockGetWeatherTool,
};

/**
 * Substitui tools reais por mocks
 * Útil para testes que precisam validar tool calling sem fazer HTTP requests reais
 */
export function createMockTools(toolManifests: ToolManifest[]) {
  return toolManifests.map((manifest) => {
    const name = manifest.tool.name;

    // Se temos um mock específico, usa ele
    if (TOOL_MOCKS[name]) {
      return TOOL_MOCKS[name]();
    }

    // Fallback: noop tool que apenas retorna os args
    console.log(`  [MOCK] Creating generic mock for tool: ${name}`);
    return tool({
      name,
      description: manifest.tool.description,
      parameters: z.object({}),
      execute: async (args: any) => {
        console.log(`  [MOCK] ${name} called with:`, args);
        return { mocked: true, tool: name, args };
      },
    });
  });
}

/**
 * Cria um mock tool individual pelo nome
 */
export function createMockTool(toolName: string) {
  if (TOOL_MOCKS[toolName]) {
    return TOOL_MOCKS[toolName]();
  }

  throw new Error(`No mock available for tool: ${toolName}`);
}
