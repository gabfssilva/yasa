// src/runtime/json-schema-to-zod.ts
import { z } from 'zod';

/**
 * Converte JSON Schema (draft-07) para Zod schema
 * IMPORTANTE: Para tools, sempre retorna ZodObject
 */
export function jsonSchemaToZod(schema: any): z.ZodObject<any> {
  // Se não tem type, assume object
  if (!schema.type) {
    schema.type = 'object';
  }

  // Para tools, JSON Schema deve ser sempre object no root
  if (schema.type !== 'object') {
    throw new Error('Tool parameters must be JSON Schema type "object"');
  }

  return jsonSchemaToZodInternal(schema) as z.ZodObject<any>;
}

/**
 * Conversão interna que pode retornar qualquer tipo Zod
 */
function jsonSchemaToZodInternal(schema: any): z.ZodTypeAny {
  // Handle $ref (não suportado nesta versão simplificada)
  if (schema.$ref) {
    throw new Error('JSON Schema $ref not supported in this version');
  }

  // Handle type
  const type = schema.type;

  switch (type) {
    case 'string': {
      let zodString = z.string();

      if (schema.minLength !== undefined) {
        zodString = zodString.min(schema.minLength);
      }
      if (schema.maxLength !== undefined) {
        zodString = zodString.max(schema.maxLength);
      }
      if (schema.pattern) {
        zodString = zodString.regex(new RegExp(schema.pattern));
      }
      if (schema.format === 'email') {
        zodString = zodString.email();
      }
      if (schema.format === 'url' || schema.format === 'uri') {
        zodString = zodString.url();
      }

      return zodString;
    }

    case 'number':
    case 'integer': {
      let zodNumber = type === 'integer' ? z.number().int() : z.number();

      if (schema.minimum !== undefined) {
        zodNumber = zodNumber.min(schema.minimum);
      }
      if (schema.maximum !== undefined) {
        zodNumber = zodNumber.max(schema.maximum);
      }

      return zodNumber;
    }

    case 'boolean':
      return z.boolean();

    case 'array': {
      if (!schema.items) {
        return z.array(z.any());
      }

      const itemSchema = jsonSchemaToZodInternal(schema.items);
      let zodArray = z.array(itemSchema);

      if (schema.minItems !== undefined) {
        zodArray = zodArray.min(schema.minItems);
      }
      if (schema.maxItems !== undefined) {
        zodArray = zodArray.max(schema.maxItems);
      }

      return zodArray;
    }

    case 'object': {
      const shape: Record<string, z.ZodTypeAny> = {};
      const properties = schema.properties || {};
      const required = schema.required || [];

      for (const [key, propSchema] of Object.entries(properties)) {
        let propZod = jsonSchemaToZodInternal(propSchema as any);

        // Se não é required, torna opcional
        if (!required.includes(key)) {
          propZod = propZod.optional();
        }

        shape[key] = propZod;
      }

      return z.object(shape);
    }

    case 'null':
      return z.null();

    default:
      // Fallback para any se tipo não reconhecido
      console.warn(`Unknown JSON Schema type: ${type}, using z.any()`);
      return z.any();
  }
}

/**
 * Versão com suporte a anyOf, oneOf, allOf (simplificado)
 */
export function jsonSchemaToZodAdvanced(schema: any): z.ZodTypeAny {
  // anyOf -> union (não suportado para tools)
  if (schema.anyOf) {
    throw new Error('anyOf not supported in tool parameters');
  }

  // oneOf -> union (não suportado para tools)
  if (schema.oneOf) {
    throw new Error('oneOf not supported in tool parameters');
  }

  // allOf -> intersection (simplificado: apenas merge objects)
  if (schema.allOf) {
    // Para simplicidade, merge properties de todos os schemas
    const merged: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    } = {
      type: 'object',
      properties: {},
      required: [],
    };

    for (const subSchema of schema.allOf) {
      if (subSchema.properties) {
        Object.assign(merged.properties, subSchema.properties);
      }
      if (subSchema.required) {
        merged.required.push(...subSchema.required);
      }
    }

    return jsonSchemaToZod(merged);
  }

  // Caso padrão
  return jsonSchemaToZod(schema);
}
