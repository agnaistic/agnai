import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter, AdapterProps } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import { BOT_REPLACE, SELF_REPLACE } from '../../common/prompt'
import { getEncoder } from '../../common/tokenize'
import { OPENAI_MODELS } from '../../common/adapters'

// There's no tokenizer for Claude, we use OpenAI's as an estimation
const encoder = getEncoder('openai', OPENAI_MODELS.Turbo)

type Msg = {
  name: string
  content: string
}

export const handleClaude: ModelAdapter = async function* (opts) {
  const { char, members, user, settings, log, guest, gen, sender } = opts
  if (!user.claudeApiKey) {
    yield { error: `Claude request failed: Claude API key not set. Check your settings.` }
    return
  }
  const claudeModel = settings.claudeModel ?? defaultPresets.claude.claudeModel
  const username = sender.handle || 'You'
  const requestBody = {
    model: claudeModel,
    temperature: Math.min(1, Math.max(0, gen.temp ?? defaultPresets.claude.temp)),
    max_tokens_to_sample: gen.maxTokens ?? defaultPresets.claude.maxTokens,
    prompt: mkPrompt(opts),
    stop_sequences: [
      `\n\n${char.name}:`,
      `\n\n${username}:`,
      ...members.map((member) => `\n\n${member.handle}:`),
    ],
  }

  log.debug(requestBody, 'Claude payload')

  const url = `https://api.anthropic.com/v1/complete`
  const resp = await needle('post', url, JSON.stringify(requestBody), {
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': !!guest ? user.claudeApiKey : decryptText(user.claudeApiKey),
    },
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
      const trimmed = trimResponseV2(sanitised, char, members, ['END_OF_DIALOG'])
      yield trimmed || sanitised
      return
    }
  } catch (ex: any) {
    log.error({ err: ex }, 'Claude failed to parse')
    yield { error: `Claude request failed: ${ex.message}` }
    return
  }
}

const mkPrompt = (opts: AdapterProps): string => {
  const lineToMsg = (line: string, charname: string, username: string): Msg => {
    if (line === '<START>') {
      return { name: 'System', content: line }
    } else {
      const name = line.split(':')[0] ?? 'You'
      const lineUtterance = line.split(':')[1] ?? line
      const content = lineUtterance
        .trim()
        .replace(BOT_REPLACE, charname)
        .replace(SELF_REPLACE, username)
      return { name, content }
    }
  }
  const formatMsg = (msg: Msg): string => `${msg.name}: ${msg.content}`
  const sum = (nums: number[]): number => nums.reduce((acc, cur) => acc + cur, 0)
  const { char, sender, parts, gen } = opts
  const username = sender.handle || 'You'
  const lines = opts.lines ?? []
  const maxContextLength = gen.maxContextLength || defaultPresets.claude.maxContextLength
  const maxResponseTokens = gen.maxTokens ?? defaultPresets.claude.maxTokens
  const gaslightCost = encoder('System: ' + parts.gaslight)
  const ujbCost = gen.ultimeJailbreak ? encoder('System: ' + gen.ultimeJailbreak) : 0
  const maxBudget = maxContextLength - maxResponseTokens - gaslightCost - ujbCost
  const history = lines.map((ln) => lineToMsg(ln, char.name, username))
  const dropMsgUntilWithinBudget = (msgs: Msg[]): Msg[] =>
    sum(msgs.map((msg) => encoder(formatMsg(msg)))) <= maxBudget
      ? msgs
      : dropMsgUntilWithinBudget(msgs.slice(1))
  const historyTruncated = dropMsgUntilWithinBudget(history)
  const messages = [
    { name: 'System', content: parts.gaslight },
    ...historyTruncated,
    ...(gen.ultimeJailbreak ? [{ name: 'System', content: gen.ultimeJailbreak }] : []),
  ]
  // <https://console.anthropic.com/docs/prompt-design#what-is-a-prompt>
  return '\n\n' + messages.map(formatMsg).join('\n\n') + '\n\n' + char.name + ':'
}
