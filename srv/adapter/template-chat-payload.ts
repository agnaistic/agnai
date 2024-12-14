import { GenerateRequestV2 } from './type'
import { replaceTags } from '/common/presets/templates'
import { AssembledPrompt } from '/common/prompt'
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

export async function toChatMessages(
  opts: GenerateRequestV2,
  assembled: AssembledPrompt,
  counter: TokenCounter
) {
  // const sections = promptOrderToSections({
  //   format: opts.gen.modelFormat,
  //   order: opts.gen.promptOrder,
  // })

  const { sections } = assembled
  const { system, post, history } = sections.sections

  const prefill = await parse(opts, counter, opts.settings?.prefill || '')
  const messages = [{ role: 'system', content: system.join('') }]

  const sender = (opts.impersonate?.name || opts.sender.handle) + ':'
  for (let i = 0; i < history.length; i++) {
    const line = history[i]
    const original = opts.lines[i]
    const role = original?.startsWith(sender) ? 'user' : 'assistant'
    messages.push({ role, content: line })
  }

  messages.push({
    role: 'assistant',
    content: (post.join('') + (prefill.parsed.length ? ` ${prefill.parsed}` : '')).trim(),
  })
  return messages
}

async function parse(opts: GenerateRequestV2, counter: TokenCounter, text: string, limit?: number) {
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
