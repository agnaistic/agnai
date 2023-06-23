import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter, AdapterProps } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { OPENAI_MODELS } from '../../common/adapters'
import {
  SAMPLE_CHAT_PREAMBLE,
  BOT_REPLACE,
  injectPlaceholders,
  ensureValidTemplate,
  START_REPLACE,
  SAMPLE_CHAT_MARKER,
} from '../../common/prompt'
import { AppSchema } from '../../common/types/schema'
import { getEncoder } from '../tokenize'

const baseUrl = `https://api.anthropic.com/v1/complete`

// There's no tokenizer for Claude, we use OpenAI's as an estimation
const encoder = getEncoder('openai', OPENAI_MODELS.Turbo)

export const handleClaude: ModelAdapter = async function* (opts) {
  const { members, user, settings, log, guest, gen, isThirdParty } = opts
  const base = getBaseUrl(user, isThirdParty)
  if (!user.claudeApiKey && !base.changed) {
    yield { error: `Claude request failed: Claude API key not set. Check your settings.` }
    return
  }
  const claudeModel = settings.claudeModel ?? defaultPresets.claude.claudeModel

  const stops = new Set([`\n\nHuman:`, `\n\nAssistant:`])

  const requestBody = {
    model: claudeModel,
    temperature: Math.min(1, Math.max(0, gen.temp ?? defaultPresets.claude.temp)),
    max_tokens_to_sample: gen.maxTokens ?? defaultPresets.claude.maxTokens,
    prompt: createClaudePrompt(opts),
    stop_sequences: Array.from(stops),
    top_p: Math.min(1, Math.max(0, gen.topP ?? defaultPresets.claude.topP)),
    top_k: Math.min(1, Math.max(0, gen.topK ?? defaultPresets.claude.topK)),
  }

  const headers: any = {
    'Content-Type': 'application/json',
  }

  const useThirdPartyPassword = base.changed && isThirdParty && user.thirdPartyPassword
  const apiKey = useThirdPartyPassword
    ? user.thirdPartyPassword
    : !isThirdParty
    ? user.claudeApiKey
    : null

  const key = !!guest ? apiKey : apiKey ? decryptText(apiKey!) : null
  if (key) {
    headers['x-api-key'] = key
  }

  log.debug(requestBody, 'Claude payload')

  const resp = await needle('post', base.url, JSON.stringify(requestBody), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    log.error({ error: resp.error }, 'Claude request failed to send')
    yield { error: `Claude request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ body: resp.body }, `Claude request failed (${resp.statusCode})`)
    yield { error: `Claude request failed: ${resp.statusMessage}` }
    return
  }

  try {
    const completion = resp.body.completion
    if (!completion) {
      log.error({ body: resp.body }, 'OpenAI request failed: Empty response')
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
      return
    } else {
      const sanitised = sanitise(completion)
      const trimmed = trimResponseV2(sanitised, opts.replyAs, members, opts.characters, [
        'END_OF_DIALOG',
      ])
      yield trimmed || sanitised
      return
    }
  } catch (ex: any) {
    log.error({ err: ex }, 'Claude failed to parse')
    yield { error: `Claude request failed: ${ex.message}` }
    return
  }
}

function getBaseUrl(user: AppSchema.User, isThirdParty?: boolean) {
  if (isThirdParty && user.thirdPartyFormat === 'claude' && user.koboldUrl) {
    return { url: user.koboldUrl, changed: true }
  }

  return { url: baseUrl, changed: false }
}

function createClaudePrompt(opts: AdapterProps): string {
  const { char, parts, gen, replyAs } = opts
  const lines = opts.lines ?? []

  const maxContextLength = gen.maxContextLength || defaultPresets.claude.maxContextLength
  const maxResponseTokens = gen.maxTokens ?? defaultPresets.claude.maxTokens

  const gaslightCost = encoder('Human: ' + opts.prompt)
  const ujb = parts.ujb ? `Human: <system_note>${parts.ujb}</system_note>` : ''

  const maxBudget =
    maxContextLength - maxResponseTokens - gaslightCost - encoder(ujb) - encoder(char.name + ':')

  let tokens = 0
  const history: string[] = []

  const sampleAmble = SAMPLE_CHAT_PREAMBLE.replace(BOT_REPLACE, replyAs.name)
  const sender = opts.impersonate?.name ?? opts.sender.handle

  for (const line of lines.slice().reverse()) {
    const lineType: LineType = line.startsWith(sender)
      ? 'user'
      : line.startsWith('System:')
      ? 'system'
      : line.startsWith(sampleAmble)
      ? 'example'
      : 'char'

    const processedLine = processLine(lineType, line)
    const cost = encoder(processedLine)
    if (cost + tokens >= maxBudget) break

    tokens += cost
    history.push(processedLine)
  }

  const gaslight = injectPlaceholders(
    ensureValidTemplate(gen.gaslight || defaultPresets.claude.gaslight, opts.parts, [
      'history',
      'post',
    ]),
    { opts, parts, lastMessage: opts.lastMessage, characters: opts.characters || {}, encoder }
  )

  const messages = [`\n\nHuman: ${gaslight}`, ...history.reverse()]

  if (ujb) {
    messages.push(ujb)
  }

  const continueAddon =
    opts.kind === 'continue'
      ? `\n\nHuman: <system_note>Continue ${replyAs.name}'s reply.</system_note>`
      : ''

  // <https://console.anthropic.com/docs/prompt-design#what-is-a-prompt>
  return messages.join('\n\n') + continueAddon + '\n\n' + 'Assistant: ' + replyAs.name + ':'
}

type LineType = 'system' | 'char' | 'user' | 'example'

function processLine(type: LineType, line: string) {
  switch (type) {
    case 'user':
      return `Human: ${line}`

    case 'system':
      return `Human:\n<system_note>\n${line}\n</system_note>`

    case 'example':
      const mid = line
        .replace(START_REPLACE, '<system_note>New conversation started.</system_note>')
        .replace('\n' + SAMPLE_CHAT_MARKER, '')
      return `Human:\n<example_dialogue>\n${mid}\n</example_dialogue>`

    case 'char':
      return `Assistant: ${line}`
  }
}
