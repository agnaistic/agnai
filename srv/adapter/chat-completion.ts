import needle from 'needle'
import { AdapterProps, CompletionGenerator, CompletionItem } from './type'
import { defaultPresets } from '/common/default-preset'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import {
  BOT_REPLACE,
  SAMPLE_CHAT_MARKER,
  SELF_REPLACE,
  ensureValidTemplate,
  injectPlaceholders,
  insertsDeeperThanConvoHistory,
} from '/common/prompt'
import { AppSchema, TokenCounter } from '/common/types'
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

/**
 * This function contains the inserts logic for Chat models (Turbo, GPT4...)
 * This logic also exists in other places:
 * - common/prompt.ts fillPromptWithLines
 * - srv/adapter/claude.ts createClaudePrompt
 */
export async function toChatCompletionPayload(
  opts: AdapterProps,
  counter: TokenCounter,
  maxTokens: number
): Promise<CompletionItem[]> {
  if (opts.kind === 'plain') {
    return [{ role: 'system', content: opts.prompt }]
  }

  const { lines, gen, replyAs } = opts

  const injectOpts = {
    opts,
    parts: opts.parts,
    lastMessage: opts.lastMessage,
    characters: opts.characters || {},
    encoder: counter,
    jsonValues: opts.jsonValues,
  }

  const messages: CompletionItem[] = []
  const history: CompletionItem[] = []

  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  const { parsed: gaslight, inserts } = await injectPlaceholders(
    ensureValidTemplate(gen.gaslight || defaultPresets.openai.gaslight, ['history', 'post']),
    injectOpts
  )

  messages.push({ role: 'system', content: gaslight })

  const all = []

  let maxBudget =
    (gen.maxContextLength || defaultPresets.openai.maxContextLength) -
    maxTokens -
    (await counter([...inserts.values()].join(' ')))
  let tokens = await counter(gaslight)

  if (lines) {
    all.push(...lines)
  }

  // Append 'postamble' and jailbreak
  const posts = await getPostInstruction(opts, messages, counter).then((inst) => inst || [])
  posts.reverse()
  for (const post of posts) {
    post.content = await injectPlaceholders(post.content, injectOpts).then((p) => p.parsed)
    tokens += await counter(post.content)
    history.push(post)
  }

  const examplePos = all.findIndex((l) => l.includes(SAMPLE_CHAT_MARKER))

  let i = all.length - 1
  let addedAllInserts = false
  const addRemainingInserts = async () => {
    const remainingInserts = insertsDeeperThanConvoHistory(inserts, all.length - i)
    if (remainingInserts) {
      history.push({
        role: 'system',
        content: await injectPlaceholders(remainingInserts, injectOpts).then((i) => i.parsed),
      })
    }
  }
  while (i >= 0) {
    const distanceFromBottom = all.length - 1 - i

    const line = all[i]

    const obj: CompletionItem = {
      role: 'assistant',
      content: line.trim().replace(BOT_REPLACE, replyAs.name).replace(SELF_REPLACE, handle),
    }

    const isSystem = line.startsWith('System:')
    const isUser = line.startsWith(handle)
    const isBot = !isUser && !isSystem

    const insert = inserts.get(distanceFromBottom)
    if (insert)
      history.push({
        role: 'system',
        content: await injectPlaceholders(insert, injectOpts).then((p) => p.parsed),
      })

    if (i === examplePos) {
      await addRemainingInserts()
      addedAllInserts = true

      const { additions, consumed } = await splitSampleChat(
        {
          budget: maxBudget - tokens,
          sampleChat: obj.content,
          char: replyAs.name,
          sender: handle,
        },
        counter
      )

      if (tokens + consumed > maxBudget) {
        --i
        continue
      }
      history.push(...additions.reverse())
      tokens += consumed
      --i
      continue
    } else if (isBot) {
    } else if (line === '<START>') {
      obj.role = 'system'
      obj.content = sampleChatMarkerCompletionItem.content
    } else if (isSystem) {
      obj.role = 'system'
      obj.content = obj.content.replace('System:', '').trim()
    } else {
      obj.role = 'user'
    }

    const length = await counter(obj.content)
    if (tokens + length > maxBudget) {
      --i
      break
    }
    tokens += length
    history.push(obj)
    --i
  }
  if (!addedAllInserts) {
    await addRemainingInserts()
  }
  return messages.concat(history.reverse())
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

async function getPostInstruction(
  opts: AdapterProps,
  messages: CompletionItem[],
  counter: TokenCounter
): Promise<CompletionItem[] | undefined> {
  let prefix = opts.parts.ujb ?? ''

  prefix = (
    await injectPlaceholders(prefix, {
      opts,
      parts: opts.parts,
      lastMessage: opts.lastMessage,
      characters: opts.characters || {},
      encoder: counter,
      jsonValues: opts.jsonValues,
    })
  ).parsed

  switch (opts.kind) {
    // These cases should never reach here
    case 'plain':
    case 'ooc': {
      return
    }

    case 'continue':
      return [{ role: 'system', content: `${prefix}\n\nContinue ${opts.replyAs.name}'s response` }]

    case 'summary': {
      let content = opts.user.images?.summaryPrompt || IMAGE_SUMMARY_PROMPT.other

      if (!content.startsWith('(')) content = '(' + content
      if (!content.endsWith(')')) content = content + ')'

      const looks = Object.values(opts.characters || {})
        .map(getCharLooks)
        .filter((v) => !!v)
        .join('\n')

      if (looks) {
        messages[0].content += '\n' + looks
      }
      return [{ role: 'user', content }]
    }

    case 'self':
      return [
        {
          role: 'system',
          content: `${prefix}\n\n${opts.impersonate?.name || opts.sender?.handle || 'You'}:`,
        },
      ]

    case 'retry':
    case 'send':
    case 'request': {
      const appendName = opts.gen.prefixNameAppend ?? true
      const messages: CompletionItem[] = [
        {
          role: 'system',
          content: prefix,
        },
        {
          role: 'assistant',
          content: `${opts.gen.prefill ?? ''}\n\n${appendName ? opts.replyAs.name : ''}:`.trim(),
        },
      ]

      // Non-empty-ish messages
      return messages.filter((m) => {
        if (!m.content) return false
        if (m.content === ':') return false
        return true
      })
    }
  }
}

function getCharLooks(char: AppSchema.Character) {
  if (char.persona?.kind === 'text') return

  const visuals = [
    char.persona?.attributes?.looks || '',
    char.persona?.attributes?.appearance || '',
  ].filter((v) => !!v)

  if (!visuals.length) return
  return `${char.name}'s appearance: ${visuals.join(', ')}`
}

export const requestFullCompletion: CompletionGenerator = async function* (
  _userId,
  url,
  headers,
  body,
  _service,
  _log
) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
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
