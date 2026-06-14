import needle from 'needle'
import { AdapterProps, CompletionGenerator, CompletionItem } from './type'
import { BOT_REPLACE, SAMPLE_CHAT_MARKER, SELF_REPLACE } from '/common/prompt'
import { TokenCounter } from '/common/types'
import { escapeRegex } from '/common/util'

type SplitSampleChatProps = {
  sampleChat: string
  char: string
  sender: string
  budget?: number
}

// We only ever use the OpenAI gpt-3 encoder
// Don't bother passing it around since we know this already
// const encoder = () => getTokenCounter('openai', OPENAI_MODELS.Turbo)

const sampleChatMarkerCompletionItem: CompletionItem = {
  role: 'system',
  content: SAMPLE_CHAT_MARKER.replace('System: ', ''),
}

export async function splitSampleChat(opts: SplitSampleChatProps, counter: TokenCounter) {
  const { sampleChat, char, sender, budget } = opts
  const regex = new RegExp(
    `(?<=\\n)(?=${escapeRegex(char)}:|${escapeRegex(sender)}:|System:|<start>)`,
    'gi'
  )
  const additions: CompletionItem[] = []
  let tokens = 0

  for (const chat of sampleChat.replace(/\r\n/g, '\n').split(regex)) {
    const trimmed = chat.trim()
    if (!trimmed) continue

    // if the msg starts with <start> we consider everything between
    // <start> and the next placeholder a system message
    if (trimmed.toLowerCase().startsWith('<start>')) {
      const afterStart = trimmed.slice(7).trim()
      additions.push(sampleChatMarkerCompletionItem)
      tokens += await counter(sampleChatMarkerCompletionItem.content)
      if (afterStart) {
        additions.push({ role: 'system', content: afterStart })
        tokens += await counter(afterStart)
      }
      continue
    }

    const sample = trimmed.toLowerCase().startsWith('system:') ? trimmed.slice(7).trim() : trimmed
    const role = sample.startsWith(char + ':')
      ? 'assistant'
      : sample.startsWith(sender + ':')
      ? 'user'
      : 'system'

    const msg: CompletionItem = {
      role: role,
      content: sample.replace(BOT_REPLACE, char).replace(SELF_REPLACE, sender),
    }

    const length = await counter(msg.content)
    if (budget && tokens + length > budget) break

    additions.push(msg)
    tokens += length
  }

  return { additions, consumed: tokens }
}

export const requestFullCompletion: CompletionGenerator = async function* ({
  url,
  headers,
  body,
  signal,
}) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    signal: signal.signal,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield { error: `OpenAI request failed (${resp.statusCode}): ${msg}` }
    return
  }

  return resp.body
}

export function modelNeedsUserRoleLast(opts: AdapterProps, model: string): boolean {
  if (!model) return false

  if (opts.gen.postUserRole) return true
  if (opts.subscription?.preset?.postUserRole) return true

  const lowered = model.toLowerCase()
  if (lowered.includes('deepseek') && lowered.includes('3.1')) return true
  if (lowered.includes('deepseek') && lowered.includes('3.2')) return true
  if (model.includes('grok-4')) return true

  return false
}
