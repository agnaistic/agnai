import { AppSchema } from '../types'

type Notifier = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  success: (msg: string) => void
}

let notifier: Notifier = {
  info(_msg) {},
  warn(_msg) {},
  error(_msg) {},
  success(_msg) {},
}
let emitter = (_payload: { type: string }) => {}

export function setEmitter(emit: (payload: { type: string }) => void) {
  emitter = emit
}

export function emit<T extends { type: string }>(payload: T) {
  emitter(payload)
}

export function setNotifier(notify: Notifier) {
  notifier = notify
}

export function notify() {
  return notifier
}

export function sanitiseAndTrim(
  text: string,
  prompt: string,
  char: AppSchema.Character,
  characters: Record<string, AppSchema.Character> | undefined,
  members: AppSchema.Profile[]
) {
  const parsed = sanitise(text.replace(prompt, ''))
  const trimmed = trimResponseV2(parsed, char, members, characters, ['END_OF_DIALOG'])
    .split(`${char.name}:`)
    .join('')
  return trimmed || parsed
}

export function sanitise(generated: string) {
  // If want to support code blocks we need to remove the excess whitespace removal as it breaks indents
  return (generated || '').trim()
}

export function trimResponseV2(
  generated: string,
  char: AppSchema.Character,
  members: AppSchema.Profile[],
  bots: Record<string, AppSchema.Character> | undefined,
  endTokens: string[] = []
) {
  const allEndTokens = getEndTokens(null, members)

  generated = generated.split(`${char.name} :`).join(`${char.name}:`)

  for (const member of members) {
    if (!member.handle) continue
    generated = generated.split(`${member.handle} :`).join(`${member.handle}:`)
  }

  /** Do not always add character names as stop tokens here */
  // if (bots) {
  //   for (const bot of Object.values(bots)) {
  //     if (!bot) continue
  //     if (bot?._id === char._id) continue
  //     endTokens.push(`${bot.name}:`)
  //   }
  // }

  let index = -1
  let trimmed = allEndTokens.concat(...endTokens).reduce((prev, endToken) => {
    const idx = generated.indexOf(endToken)

    if (idx === -1) return prev

    const text = generated.slice(0, idx)
    if (index === -1 || idx < index) {
      index = idx
      return text
    }

    return prev
  }, '')

  if (index === -1) {
    return sanitise(generated.split(`${char.name}:`).join(''))
  }

  return sanitise(trimmed.split(`${char.name}:`).join(''))
}

export function getEndTokens(
  char: AppSchema.Character | null,
  members: AppSchema.Profile[],
  endTokens: string[] = []
) {
  const baseEndTokens = ['END_OF_DIALOG', '<END>'].concat(endTokens)

  if (char) {
    baseEndTokens.push(`${char.name}:`, `${char.name} :`)
  }

  for (const member of members) {
    baseEndTokens.push(`${member.handle}:`, `${member.handle} :`)
  }

  const uniqueTokens = Array.from(new Set(baseEndTokens))
  return uniqueTokens
}
