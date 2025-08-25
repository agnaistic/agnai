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
