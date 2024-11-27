import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { registerAdapter } from './register'
import { getStoppingStrings } from './prompt'
import { streamCompletion } from './stream'

const venusOptions: Record<string, string> = {
  Mars: 'asha',
  Mercury: 'mythomax',
}

const modelOptions = Object.entries(venusOptions).map(([label, value]) => ({ label, value }))

export const handleVenus: ModelAdapter = async function* (opts) {
  const body = {
    model: opts.gen.thirdPartyModel || 'mythomax',
    frequency_penalty: opts.gen.frequencyPenalty,
    max_tokens: opts.gen.maxTokens,
    min_tokens: 0,
    template: opts.prompt,
    presence_penalty: opts.gen.presencePenalty,
    stream: true,
    return_raw: true,
    temperature: opts.gen.temp,
    top_p: opts.gen.topP,
    top_k: opts.gen.topK,
    stop: getStoppingStrings(opts),
  }

  const url = `https://inference.chub.ai/prompt`
  const key = opts.user.adapterConfig?.venus?.apiKey
  if (!key) {
    yield { error: `Venus request failed: API key not set` }
    return
  }

  const apiKey = opts.guest ? key : decryptText(key)
  opts.log.debug({ ...body, prompt: null }, 'Venus payload')
  opts.log.debug(`Prompt:\n${body.template}`)
  yield { prompt: body.template }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }

  const iter = streamCompletion(opts.user._id, url, headers, body, 'Venus', opts.log, 'openai')
  let accumulated = ''

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      break
    }

    if (generated.value.error) {
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token

      if (opts.gen.streamResponse) {
        yield {
          partial: sanitiseAndTrim(
            accumulated,
            body.template,
            opts.char,
            opts.characters,
            opts.members
          ),
        }
      }
    }
  }

  const parsed = sanitise(accumulated)
  const trimmed = trimResponseV2(parsed, opts.replyAs, opts.members, opts.characters, body.stop)

  yield trimmed || parsed
}

registerAdapter('venus', handleVenus, {
  label: 'Venus',
  settings: [
    {
      field: 'url',
      label: 'Model',
      secret: false,
      setting: { type: 'list', options: modelOptions },
      preset: true,
    },
    {
      field: 'apiKey',
      label: 'API Key',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. CHK-SBIX...' },
    },
  ],
  options: [
    'temp',
    'frequencyPenalty',
    'presencePenalty',
    'systemPrompt',
    'gaslight',
    'topP',
    'topK',
    'typicalP',
  ],
})
