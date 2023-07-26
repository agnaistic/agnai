import { SUPPORTS_INSTRUCT } from './adapters'
import {
  HOLDERS,
  type BuildPromptOpts,
  type PromptParts,
  fillPromptWithLines,
  getAdapter,
  BOT_REPLACE,
  SELF_REPLACE,
  SAMPLE_CHAT_MARKER,
  SAMPLE_CHAT_PREAMBLE,
  getContextLimit,
} from './prompt'
import { Encoder } from './tokenize'
import { AppSchema } from './types'
import { elapsedSince } from './util'

type InjectOpts = {
  opts: BuildPromptOpts
  parts: PromptParts
  lastMessage?: string
  characters: Record<string, AppSchema.Character>
  history?: { lines: string[]; order: 'asc' | 'desc' }
  encoder: Encoder
}

export function parseTemplateV1(
  template: string,
  { opts, parts, history: hist, encoder, ...rest }: InjectOpts
) {
  const profile = opts.members.find((mem) => mem.userId === opts.chat.userId)
  const sender = opts.impersonate?.name || profile?.handle || 'You'

  // Automatically inject example conversation if not included in the prompt
  const sampleChat = parts.sampleChat?.join('\n')
  if (!template.match(HOLDERS.sampleChat) && sampleChat && hist) {
    const next = hist.lines.filter((line) => !line.includes(SAMPLE_CHAT_MARKER))

    const postSample =
      opts.settings?.service && SUPPORTS_INSTRUCT[opts.settings.service]
        ? SAMPLE_CHAT_MARKER
        : '<START>'

    const msg = `${SAMPLE_CHAT_PREAMBLE}\n${sampleChat}\n${postSample}`
      .replace(BOT_REPLACE, opts.replyAs.name)
      .replace(SELF_REPLACE, sender)
    if (hist.order === 'asc') next.unshift(msg)
    else next.push(msg)

    hist.lines = next
  }

  let prompt = template
    // UJB must be first to replace placeholders within the UJB
    // Note: for character post-history-instructions, this is off-spec behavior
    .replace(HOLDERS.ujb, parts.ujb || '')
    .replace(HOLDERS.sampleChat, newline(sampleChat))
    .replace(HOLDERS.scenario, parts.scenario || '')
    .replace(HOLDERS.memory, newline(parts.memory))
    .replace(HOLDERS.persona, parts.persona)
    .replace(HOLDERS.impersonating, parts.impersonality || '')
    .replace(HOLDERS.allPersonas, parts.allPersonas?.join('\n') || '')
    .replace(HOLDERS.post, parts.post.join('\n'))
    .replace(HOLDERS.linebreak, '\n')
    .replace(HOLDERS.chatAge, elapsedSince(opts.chat.createdAt))
    .replace(HOLDERS.idleDuration, elapsedSince(rest.lastMessage || ''))
    .replace(HOLDERS.chatEmbed, parts.chatEmbeds.join('\n') || '')
    .replace(HOLDERS.userEmbed, parts.userEmbeds.join('\n') || '')
    // system prompt should not support other placeholders
    .replace(HOLDERS.systemPrompt, newline(parts.systemPrompt))
    // All placeholders support {{char}} and {{user}} placeholders therefore these must be last
    .replace(BOT_REPLACE, opts.replyAs.name)
    .replace(SELF_REPLACE, sender)

  if (hist) {
    const messages = hist.order === 'asc' ? hist.lines.slice().reverse() : hist.lines.slice()
    const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)
    const maxContext = getContextLimit(opts.settings, adapter, model)
    const history = fillPromptWithLines(encoder, maxContext, prompt, messages).reverse()
    prompt = prompt.replace(HOLDERS.history, history.join('\n'))
  }

  return prompt
}

function newline(value: string | undefined) {
  if (!value) return ''
  return '\n' + value
}
