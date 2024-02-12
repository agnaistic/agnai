// srv/adapter/mistral.ts
import needle from 'needle'
import { sanitiseAndTrim } from '../api/chat/common'
import { ModelAdapter, AdapterProps } from './type';
import { defaultPresets } from '../../common/presets'
import { AppLog } from '../logger';
import { requestStream } from './stream';  


const baseUrl = 'https://api.mistral.ai/v1';
const apiVersion = '0.0.3'; 

const RETRY_STATUS_CODES = [429, 500, 502, 503, 504];
async function retryRequest(fn: () => Promise<any>, retries: number = 5, delay: number = 500): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof MistralAPIError && RETRY_STATUS_CODES.includes(error.statusCode as number)) {
        const waitTime = Math.pow(2, attempt) * delay;
        console.log(`Retrying after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Rethrow if it's not a retry-able error
      }
    }
  }
  throw new MistralAPIError('Max retries reached');
}
class MistralAPIError extends Error {
  statusCode: number | undefined;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'MistralAPIError';
    this.statusCode = statusCode;
  }
}

type MistralCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string; // 'role' can be 'system', 'user', or 'assistant'
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type CompletionGenerator = (
  url: string,
  body: Record<string, any>,
  headers: Record<string, string | string[] | number>,
  userId: string,
  log: AppLog
) => AsyncGenerator<{ error: string } | MistralCompletion, void, unknown>;

// SOURCES
// ----📖 Official Mistral API: https://docs.mistral.ai/api/#operation/createChatCompletion 
// ----📖 Client usage via Mistral's Github: https://github.com/mistralai/client-js/blob/main/src/client.js
export const handleMistral: ModelAdapter = async function* (opts) {
  const { user, log, gen, characters } = opts;

  if (!user.mistralApiKey) {
    yield { error: `Mistral request failed: Mistral API key not set. Check your settings.` };
    return;
  }

  const mistralModel = gen.mistralModel ?? defaultPresets.mistral.mistralModel;

  const payload = {
    model: mistralModel,
    messages: [
      { 
        role: 'user', 
        content: defaultPresets.mistral.systemPrompt, 
      }
    ],
    temperature: defaultPresets.mistral.temp,
    top_p: defaultPresets.mistral.topP,
    max_tokens: defaultPresets.mistral.maxTokens,
    stream: gen.streamResponse ?? defaultPresets.mistral.streamResponse,
  };

  const headers: any = {
    'Content-Type': 'application/json',
    'User-Agent': `mistral-client-js/${apiVersion}`,
    'Authorization': `Bearer ${user.mistralApiKey}`,
    'Accept': payload.stream ? 'text/event-stream' : 'application/json',
  };

  // log.debug({ ...payload, messages: null }, 'Mistral payload');
  // log.debug(`Messages:\n${JSON.stringify(payload.messages, null, 2)}`);
  // yield { messages: payload.messages };

  const url = `${baseUrl}/chat/completions`;

  if (payload.stream) {     // ***Handle streaming***
    for await (const completion of streamCompletion(url, payload, headers, user._id, log)) {
      if ('error' in completion) {
        yield { error: completion.error };
        return;
      }
      yield completion; // Yield each streamed event or completion
    }
  } else {     // ***Handle non-streaming***
      try {
        const resp = await retryRequest(async () => {
          const response = await needle('post', url, payload, { headers }).catch(err => {
            throw new MistralAPIError(err.message);
          });
          if (response.statusCode && response.statusCode >= 400) {
            throw new MistralAPIError(`Mistral request failed (${response.statusCode}): ${response.body?.error?.message || response.body.message || response.statusMessage || 'Unknown error'}`, response.statusCode);
          }
          return response.body;
        });

        yield resp;
      } catch (error) {
        if (error instanceof MistralAPIError) {
          yield { error: error.message };
          return;
        }
      // Handle other types of errors if necessary
    }
  }

    
};


const streamCompletion: CompletionGenerator = async function* (
  url,
  body,
  headers,
  userId,
  log
) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }));

  if ('error' in resp) {
    log.error({ error: resp.error }, 'Mistral request failed to send');
    yield { error: `Mistral request failed: ${resp.error?.message || resp.error}` };
    return;
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ body: resp.body }, `Mistral request failed (${resp.statusCode})`);
    yield { error: `Mistral request failed: ${resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'}` };
    return;
  }

  if (body.stream) {
    for await (const event of requestStream(resp.body)) {
      if (event.error) {
        yield { error: event.error };
        return;
      }
      yield event; // Yield each streamed event or completion
    }
  } else {
    yield resp.body; // For non-streaming responses, yield the entire response body
  }
};