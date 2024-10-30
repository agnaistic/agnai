import { AdapterProps } from './type'
import { replaceTags } from '/common/presets/templates'
import { getContextLimit } from '/common/prompt'
import { promptOrderToSections } from '/common/prompt-order'
import { parseTemplate } from '/common/template-parser'
import { AppSchema, TokenCounter } from '/common/types'

export function renderMessagesToPrompt(
  preset: AppSchema.GenSettings,
  messages: Array<{ role: string; content: string }>
) {
  const output: string[] = []

  const systems: string[] = []
  let lastTag: 'system' | 'user' | 'bot' = messages[0]?.role as any

  for (let i = 0; i < messages.length; ++i) {
    const msg = messages[i]
    const tag = msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'bot'

    if (tag === 'system') {
      systems.push(msg.content)
    }

    if (systems.length && tag !== 'system') {
      output.push(`<system>${systems.join('\n\n')}</system>`)
      systems.length = 0
    }

    if (tag !== 'system') {
      output.push(`<${tag}>${msg.content}</${tag}>`)
    }
  }

  if (systems.length) {
    output.push(`<system>${systems.join('\n\n')}</system>`)
  }

  if (lastTag !== 'bot') {
    output.push(`<bot>`)
  }

  const template = output.join('\n\n')
  const prompt = replaceTags(template, preset.modelFormat || 'ChatML')
  return { prompt, stop: replaceTags('</bot>', preset.modelFormat || 'ChatML') }
}

export async function toChatMessages(opts: AdapterProps, counter: TokenCounter) {
  const sections = promptOrderToSections({
    format: opts.gen.modelFormat,
    order: opts.gen.promptOrder,
  })

  const maxContext = getContextLimit(opts.user, opts.gen)

  const system = await parse(opts, counter, sections.system)
  const defs = await parse(opts, counter, sections.defs)
  const post = await parse(opts, counter, sections.post)
  const note = opts.char.insert
    ? await parse(opts, counter, opts.char.insert.prompt)
    : { parsed: '', count: 0 }

  let limit = maxContext - system.count - defs.count - post.count - note.count
  const history = await parse(opts, counter, sections.history, limit)

  const messages = [
    { role: 'system', content: system.parsed },
    { role: 'user', content: defs.parsed },
  ]

  const sender = (opts.impersonate?.name || opts.sender.handle) + ':'
  for (const line of history.sections.sections.history) {
    const role = line.startsWith(sender) ? 'user' : 'assistant'
    messages.push({ role, content: line })
  }

  messages.push({ role: 'assistant', content: post.parsed })
  return messages
}

async function parse(opts: AdapterProps, counter: TokenCounter, text: string, limit?: number) {
  const template = replaceTags(text, 'None')
  const { parsed, sections } = await parseTemplate(template, {
    char: opts.char,
    chat: opts.chat,
    jsonValues: {},
    sender: opts.sender,
    impersonate: opts.impersonate,
    lines: opts.lines,
    limit: limit ? { context: limit, encoder: counter } : undefined,
  })

  const count = await counter(parsed)

  return { parsed, count, sections }
}
