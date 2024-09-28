import { replaceTags } from '/common/presets/templates'
import { AppSchema } from '/common/types'

export function renderMessagesToPrompt(
  preset: AppSchema.UserGenPreset,
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
