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

export function joinThoughtTokens(accum: string, thoughts: string) {
  if (!thoughts.trim()) return accum

  return `<think>${thoughts}</think>${accum}`
}

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

type SanitiseOpts = {
  text: string
  char: AppSchema.Character
  members: AppSchema.Profile[]
  gen: Partial<AppSchema.GenSettings>
  stops?: string[]
}

export function sanitiseAndTrim({ text, char, members, gen, stops }: SanitiseOpts) {
  let parsed = sanitise(text)

  const trimmed = trimResponseV2(parsed, char, members, gen, stops).split(`${char.name}:`).join('')
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
  gen: Partial<AppSchema.GenSettings> | undefined,
  endTokens: string[] = []
) {
  const allEndTokens = getEndTokens(null, members, endTokens)

  generated = generated.split(`${char.name} :`).join(`${char.name}:`)
  if (gen?.reasoning?.start) {
    generated = generated.replaceAll('<think>', gen.reasoning.start)
  }

  if (gen?.reasoning?.end) {
    generated = generated.replaceAll('</think>', gen.reasoning.end)
  }

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

export function getChoiceProp<T = any>(json: any, prop: string, assign?: any) {
  const choice = json?.choices?.[0]
  let value = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]

  const isThought = prop === 'reasoning' || prop === 'thought'
  const isToken = prop === 'content' || prop === 'text'

  // Mistral returns arrays as in their deltas for some bizarre reason
  if (Array.isArray(value)) {
    if (!isThought) return
    const first = value[0]
    if (!first) return

    if (first.type !== 'thinking') return
    if (!first.thinking?.[0]) return
    return first.thinking?.[0]?.text
  }

  if (typeof value !== 'string' && (isToken || isThought)) return

  if (assign && value) {
    assign[prop] = value
  }

  return value as T
}

export function getNextTokens(json: any) {
  const props = ['content', 'text']

  const choice = json?.choices?.[0]
  let value: any = undefined

  for (const prop of props) {
    const match = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]
    if (!match) continue

    value = match
    break
  }

  return value
}

export function getNextThoughts(json: any) {
  const props = ['reasoning', 'thought', 'reasoning_content']
  const choice = json?.choices?.[0]

  let value: any = undefined
  for (const prop of props) {
    const match = choice?.delta?.[prop] || choice?.[prop] || json?.[prop]
    if (!match) continue

    value = match
    break
  }

  if (!value) return

  if (typeof value === 'string') return value

  // Mistral returns thoughts in an array for some reason string
  if (Array.isArray(value)) {
    const first = value[0]
    if (!first) return

    if (first.type !== 'thinking') return
    if (!first.thinking?.[0]) return
    return first.thinking?.[0]?.text
  }

  return
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

export function joinUrl(base: string, path: string) {
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }

  if (path.startsWith('/')) {
    path = path.slice(1)
  }

  return `${base}/${path}`
}

export async function getThirdPartyModels(url: string, key: string) {
  const headers: any = { Accept: 'application/json', 'anthropic-version': '2023-06-01' }

  if (key) {
    headers.Authorization = `Bearer ${key}`
    headers['x-api-key'] = key
  }

  {
    const res = await fetch(joinUrl(url, 'models'), { headers, method: 'GET' })
      .then((res) => res.json())
      .catch((err) => ({ err }))

    if (res && 'err' in res === false) {
      if (Array.isArray(res)) {
        return { data: res, url }
      }

      if (Array.isArray(res?.data)) {
        res.url = url
        return res
      }
    }
  }
  const autoUrl = joinUrl(url, 'v1')
  const res = await fetch(joinUrl(autoUrl, 'models'), { headers, method: 'GET' })
    .then((res) => res.json())
    .catch((err) => ({ err }))

  if (res && 'err' in res === false) {
    if (Array.isArray(res?.data)) {
      res.url = autoUrl
      return res
    }

    if (Array.isArray(res)) {
      return { data: res, url: autoUrl }
    }
  }

  return
}

const OFFICIAL_OAI_URL = `https://api.openai.com`

export function getOaiCompatibleUrl(
  preset: Partial<AppSchema.GenSettings>,
  isThirdParty?: boolean
) {
  if (isThirdParty && preset.thirdPartyUrl) {
    if (!preset.providerId && preset.thirdPartyUrlNoSuffix) {
      return { url: preset.thirdPartyUrl, changed: true }
    }

    // If the user provides a versioned API URL for their third-party API, use that. Otherwise
    // fall back to the standard /v1 URL.
    const version = preset.thirdPartyUrl.match(/\/v\d+/) ? '' : '/v1'
    return { url: preset.thirdPartyUrl + version, changed: true }
  }

  return {
    url: OFFICIAL_OAI_URL.includes('/v1') ? OFFICIAL_OAI_URL : `${OFFICIAL_OAI_URL}/v1`,
    changed: false,
  }
}
