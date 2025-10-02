// src/server/streaming.ts
import { randomUUID } from 'crypto';

/**
 * Transforma eventos do OpenAI Agents SDK em formato OpenAI Chat Completions SSE
 */
export async function* transformAgentStreamToOpenAI(
  stream: AsyncIterable<unknown>,
  modelId: string
) {
  const completionId = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  try {
    for await (const event of stream) {
      const typedEvent = event as {
        name?: string;
        type?: string;
        data?: {
          type: string;
          event?: { type?: string; [key: string]: unknown };
        },
        item?: unknown;
      };

      // console.log(JSON.stringify(typedEvent))

      if (typedEvent.name === 'tool_output') {
        yield {
          event: 'run_item_stream_event',
          data: JSON.stringify(typedEvent),
        }
      }

      if (typedEvent.type === 'raw_model_stream_event' && typedEvent.data?.event) {
        const eventData = typedEvent.data.event;
        const eventType = eventData.type || 'unknown';

        yield {
          event: eventType,
          data: JSON.stringify(eventData),
        };
      } else if (typedEvent.type === 'raw_model_stream_event') {
        yield {
          event: typedEvent.type,
          data: JSON.stringify(typedEvent.data),
        }
      }
    }

    yield { event: 'done', data: '[DONE]' }
  } catch (error) {
    yield {
      data: JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Stream error',
        },
      }),
    };
  }
}
