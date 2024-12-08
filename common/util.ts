import { AppSchema } from './types/schema'
import { GenerateRequestV2 } from '/srv/adapter/type'

export const PING_INTERVAL_MS = 30000

export function replace<T extends { _id: string }>(id: string, list: T[], item: Partial<T>) {
  return list.map((li) => (li._id === id ? { ...li, ...item } : li))
}

export function exclude<T extends { _id: string }>(list: T[], ids: string[]) {
  const set = new Set(ids)
  return list.filter((item) => !set.has(item._id))
}

export function findOne<T extends { _id: string }>(id: string, list: T[]): T | void {
  for (const item of list) {
    if (item._id === id) return item
  }
}

export function round(value: number, places = 2) {
  const pow = Math.pow(10, places)
  return Math.round(value * pow) / pow
}

export function toArray<T>(values?: T | T[]): T[] {
  if (values === undefined) return []
  if (Array.isArray(values)) return values
  return [values]
}

export function distinct<T extends { _id: string }>(values: T[]) {
  const set = new Set<string>()
  const next: T[] = []

  for (const item of values) {
    if (set.has(item._id)) continue
    next.push(item)
    set.add(item._id)
  }

  return next
}
export function wait(secs: number) {
  return new Promise((res) => setTimeout(res, secs * 1000))
}

export function waitMs(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function isObject(val: unknown) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

export function cycleArray<T>(arr: T[], shiftAmount: number) {
  const effectiveShift = shiftAmount % arr.length
  return [...arr.slice(effectiveShift), ...arr.slice(0, effectiveShift)]
}

export const dateStringFromUnix = (unixTimestamp: number): string =>
  new Date(unixTimestamp).toISOString()

export function uniqBy<T, U>(arr: T[], accessor: (el: T) => U) {
  return arr.flatMap((el, i) => (arr.slice(0, i).map(accessor).includes(accessor(el)) ? [] : [el]))
}

export function toDuration(valueSecs: number, full?: boolean) {
  if (valueSecs === 0) {
    if (full) return '0s'
    return '0 seconds'
  }
  const {
    duration: [days, hours, minutes, seconds],
  } = toRawDuration(valueSecs)

  if (full) {
    return [`${days}d`, `${hours}h`, `${minutes}m`, `${seconds}s`]
      .filter((time) => !time.startsWith('0'))
      .join(':')
  }

  if (days) {
    return `${days} ${days > 1 ? 'days' : 'day'}`
  }

  if (hours) {
    return `${hours} ${hours > 1 ? 'hours' : 'hour'}`
  }

  if (minutes) {
    return `${minutes} ${minutes > 1 ? 'mins' : 'min'}`
  }

  return `${seconds} ${seconds > 1 ? 'seconds' : 'second'}`
}

export function elapsedSince(date: string | Date, offsetMs: number = 0) {
  if (!date) return 'unknown'
  const diff = Date.now() - new Date(date).valueOf() + offsetMs
  const elapsed = Math.floor(diff / 1000)
  if (elapsed < 60) return 'a moment'
  return toDuration(Math.floor(elapsed))
}

const ONE_HOUR_MS = 60000 * 60
const ONE_HOUR_SECS = 3600
const ONE_DAY_SECS = 86400

type Days = number
type Hours = number
type Minutes = number
type Seconds = number

type Duration = [Days, Hours, Minutes, Seconds]

function toRawDuration(valueSecs: number) {
  const days = Math.floor(valueSecs / ONE_DAY_SECS)
  const hours = Math.floor(valueSecs / ONE_HOUR_SECS) % 24
  const mins = Math.floor(valueSecs / 60) % 60
  const secs = Math.ceil(valueSecs % 60)

  return {
    duration: [days, hours, mins, secs] as Duration,
    seconds: valueSecs,
    text: valueSecs <= 0 ? 'now' : `${days}d:${hours}h:${mins}m:${secs}s`.replace('0d:', ''),
  }
}

/**
 * Remove leading tabs and whitespace on each line from template strings
 * Also 'trim' the text before returning
 */
export function neat(params: TemplateStringsArray, ...rest: string[]) {
  let str = ''
  for (let i = 0; i < params.length; i++) {
    str += params[i] + (rest[i] || '')
  }

  return str
    .split('\n')
    .map((line) => line.replace(/^[\t ]+/g, ''))
    .join('\n')
    .trim()
}

const END_SYMBOLS = new Set(`."”;’'*!！?？)}]\`>~`.split(''))
const MID_SYMBOLS = new Set(`.)}’'!?\``.split(''))

export function trimSentence(text: string) {
  if (text.trim().endsWith('```')) {
    // We want pairs of code block symbols
    const count = text.match(/```/g)?.length

    if (count && count % 2 === 0) return text.trimEnd()
  }

  let index = -1,
    checkpoint = -1
  for (let i = text.length - 1; i >= 0; i--) {
    if (END_SYMBOLS.has(text[i])) {
      // Skip ahead if the punctuation mark is preceded by white space
      if (i && /[\p{White_Space}\n<]/u.test(text[i - 1])) {
        index = i - 1
        continue
      }

      // Save if there are several punctuation marks in a row
      if (i && END_SYMBOLS.has(text[i - 1])) {
        if (checkpoint < i) checkpoint = i
        continue
      }

      // Skip if the punctuation mark is in the middle of a word
      if (
        MID_SYMBOLS.has(text[i]) &&
        i > 0 &&
        i < text.length - 1 &&
        /\p{L}/u.test(text[i - 1]) &&
        /\p{L}/u.test(text[i + 1])
      ) {
        continue
      }

      index = checkpoint > i ? checkpoint : i
      break
    } else {
      checkpoint = -1
    }
  }

  return index === -1 ? text.trimEnd() : text.slice(0, index + 1).trimEnd()
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// https://stackoverflow.com/a/3561711
export function escapeRegex(string: string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
}

export function getMessageAuthor(opts: {
  kind?: GenerateRequestV2['kind']
  chat: AppSchema.Chat
  msg: AppSchema.ChatMessage
  chars: Record<string, AppSchema.Character>
  members: Map<string, AppSchema.Profile>
  sender: AppSchema.Profile
  impersonate?: AppSchema.Character
}) {
  const { chat, msg, chars, members, sender, impersonate } = opts

  if (msg.characterId) {
    const char =
      msg.characterId === impersonate?._id
        ? impersonate
        : chars[msg.characterId] || chat.tempCharacters?.[msg.characterId]
    return char?.name || msg.name || 'Unknown'
  }

  if (msg.userId) {
    return members.get(msg.userId)?.handle || sender.handle || 'You'
  }

  return impersonate?.name || sender.handle || 'You'
}

export function getBotName(
  chat: AppSchema.Chat,
  msg: AppSchema.ChatMessage,
  chars: Record<string, AppSchema.Character>,
  replyAs: AppSchema.Character,
  main: AppSchema.Character,
  sender: AppSchema.Profile,
  impersonate?: AppSchema.Character
) {
  const charId = msg.characterId || ''
  if (!charId) return replyAs?.name || main.name

  if (charId.startsWith('temp-')) {
    const temp = chat.tempCharacters?.[charId]
    if (!temp) return main.name
    return temp.name
  }

  const char = msg.characterId && impersonate?._id === msg.characterId ? impersonate : chars[charId]

  if (!char) {
    return main.name
  }

  return char.name
}

export type EventGenerator<T> = {
  stream: AsyncGenerator<T, T>
  push: (value: T) => void
  done: () => void
  isDone: () => boolean
}

export function eventGenerator<T = any>(): EventGenerator<T> {
  const queue: Array<Promise<any>> = []
  let done = false
  let signal = false

  const stream = (async function* () {
    while (!done) {
      await waitMs(1)
      const promise = queue.shift()
      if (!promise) {
        if (signal) {
          done = true
        }
        continue
      }

      const result = await promise
      yield result
    }
  })() as AsyncGenerator<T, T>

  return {
    stream,
    push: (value: T) => {
      if (done) return
      queue.push(Promise.resolve(value))
    },
    done: () => {
      if (done) return
      signal = true
    },
    isDone: () => done,
  }
}

/**
 * Will automatically clamp to `-max -> max` if `min` is not provided
 */
export function clamp(toClamp: number, max: number, min?: number) {
  toClamp = Math.min(toClamp, max)
  if (min !== undefined) {
    toClamp = Math.max(toClamp, min)
  } else {
    toClamp = Math.max(toClamp, -max)
  }

  return toClamp
}

export function now() {
  return new Date(Date.now()).toISOString()
}

export function parseStops(stops?: string[]) {
  if (!stops) return

  const next = stops.map((stop) => stop.replace(/(\\n|\r\n|\r)/g, '\n'))
  return next
}

const copyables: Record<string, boolean> = {
  string: true,
  boolean: true,
  function: true,
  undefined: true,
  number: true,
}

export function deepClone<T extends object>(obj: T): T {
  if (copyables[typeof obj] || !obj) return obj

  let copy: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const subCopy = []

      for (const subval of value) {
        subCopy.push(deepClone(subval))
      }

      copy[key] = subCopy
      continue
    }

    if (copyables[typeof value] || !value) {
      copy[key] = value
      continue
    }

    copy[key] = deepClone(value)
  }

  return copy
}

type UserSub = {
  type: AppSchema.SubscriptionType
  tier: AppSchema.SubscriptionTier
  level: number
}

export function getUserSubscriptionTier(
  user: Pick<AppSchema.User, 'patreon' | 'billing' | 'sub' | 'manualSub' | '_id' | 'username'>,
  tiers: AppSchema.SubscriptionTier[],
  previous?: UserSub
): UserSub | undefined {
  let nativeTier = tiers.find((t) => user.sub && t._id === user.sub.tierId)
  let patronTier = getPatreonEntitledTier(user, tiers)

  const manualId = !isExpired(user.manualSub?.expiresAt) ? user.manualSub?.tierId : null
  let manualTier = manualId ? tiers.find((t) => t._id === manualId) : undefined

  const nativeExpired = isExpired(user.billing?.validUntil) || user.billing?.status === 'cancelled'
  const patronGifted = user.patreon?.member?.attributes?.is_gifted === true
  const patronExpired =
    isExpired(user.patreon?.member?.attributes.next_charge_date) ||
    user.patreon?.member?.attributes.patron_status !== 'active_patron'

  if (nativeExpired) {
    nativeTier = undefined
  }

  if (patronExpired && !patronGifted) {
    patronTier = undefined
  }

  if (!nativeTier && !patronTier && !manualTier) {
    return previous
  }

  const highest = getHighestTier(
    { source: 'native', tier: nativeTier },
    { source: 'patreon', tier: patronTier },
    { source: 'manual', tier: manualTier }
  )

  const result = { type: highest.source, tier: highest.tier, level: highest.tier.level }
  if (previous) {
    return result.level > previous.level ? result : previous
  }

  return result
}

export function getPatreonEntitledTier(
  user: Pick<AppSchema.User, 'patreon'>,
  tiers: AppSchema.SubscriptionTier[]
) {
  if (!user.patreon?.tier) return
  const entitlement = user.patreon.tier.attributes?.amount_cents
  if (!entitlement) return

  return getPatreonEntitledTierByCost(entitlement, tiers)
}

export function getPatreonEntitledTierByCost(
  entitlement: number,
  tiers: AppSchema.SubscriptionTier[]
) {
  if (!entitlement) return

  const tier = tiers.reduce<AppSchema.SubscriptionTier | undefined>((prev, curr) => {
    if (!curr.enabled || curr.deletedAt) return prev
    if (!curr.patreon) return prev
    if (!curr.patreon.tierId) return prev
    if (curr.patreon.cost > entitlement) return prev
    if (prev && prev.patreon?.cost! > curr.patreon.cost) return prev
    return curr
  }, undefined)

  return tier
}

function isExpired(expiresAt?: string, graceHrs = 3) {
  if (!expiresAt) return true

  const threshold = Date.now() - graceHrs * ONE_HOUR_MS

  const expires = new Date(expiresAt).valueOf()
  if (threshold > expires) return true
  return false
}

export function isPastDate(date: Date | string) {
  const ms = typeof date === 'string' ? new Date(date).valueOf() : date.valueOf()

  if (Date.now() > ms) return true
  return false
}

function getHighestTier(
  ...tiers: Array<{ source: AppSchema.SubscriptionType; tier?: AppSchema.SubscriptionTier }>
): { source: AppSchema.SubscriptionType; tier: AppSchema.SubscriptionTier } {
  const sorted = tiers.filter((t) => !!t.tier).sort((l, r) => r.tier!.level - l.tier!.level)
  return sorted[0] as any
}

export function tryParse<T = any>(value?: any): T | undefined {
  if (!value) return
  try {
    const obj = JSON.parse(value)
    return obj
  } catch (ex) {}
}

export function parsePartialJson(value: string) {
  {
    const obj = tryParse(value.trim())
    if (obj) return obj
  }
  {
    const obj = tryParse(value.trim() + '}')
    if (obj) return obj
  }
  {
    const obj = tryParse(value.trim() + '"}')
    if (obj) return obj
  }
}

const SAFE_NAME = /[_\/'"!@#$%^&*()\[\],\.:;=+-]+/g

export function hydrateTemplate(def: Ensure<AppSchema.Character['json']>, json: any) {
  const map = new Map<string, string>()

  for (const key in def.schema) {
    map.set(key.toLowerCase().replace(SAFE_NAME, ' '), key)
  }

  const output: any = {}

  for (const [key, value] of Object.entries(json)) {
    const safe = key.replace(SAFE_NAME, ' ')
    const alias = map.get(safe)

    if (alias) {
      output[alias] = value
    } else {
      output[key] = value
    }
  }

  let response = def.response || ''
  let history = def.history || ''

  const resVars = response.match(JSON_NAME_RE())
  const histVars = history.match(JSON_NAME_RE())

  if (resVars) {
    for (const holder of resVars) {
      const trimmed = holder.slice(2, -2)
      const safe = trimmed.replace(SAFE_NAME, ' ')
      const value = output[safe] ?? output[trimmed]

      response = response.split(holder).join(value ?? '')
    }
  }

  if (histVars) {
    for (const holder of histVars) {
      const trimmed = holder.slice(2, -2)
      const safe = trimmed.replace(SAFE_NAME, ' ')
      const value = output[safe] ?? output[trimmed]

      history = history.split(holder).join(value ?? '')
    }
  }

  return { values: output, response, history }
}

export type HydratedJson = {
  values: any
  response: string
  history: string
}

export const JSON_NAME_RE = () => /{{[a-zA-Z0-9 _'!@#$&*%()^=+-:;",\.<>?\/\[\]]+}}/g

export function jsonHydrator(def: Ensure<AppSchema.Character['json']>) {
  const map = new Map<string, string>()
  const resVars = (def.response || '').match(JSON_NAME_RE())
  const histVars = (def.history || '').match(JSON_NAME_RE())

  for (const key in def.schema) {
    map.set(key.toLowerCase().replace(SAFE_NAME, ' '), key)
  }

  const hydrate = (json: any) => {
    const output: any = {}

    for (const [key, value] of Object.entries(json)) {
      const safe = key.replace(SAFE_NAME, ' ')
      const alias = map.get(safe)

      if (alias) {
        output[alias] = value
      } else {
        output[key] = value
      }
    }

    let response = def.response || ''
    let history = def.history || ''

    if (resVars) {
      for (const holder of resVars) {
        const trimmed = holder.slice(2, -2)
        const safe = trimmed.replace(SAFE_NAME, ' ')
        const value = output[safe] ?? output[trimmed]

        response = response.split(holder).join(value ?? '')
      }
    }

    if (histVars) {
      for (const holder of histVars) {
        const trimmed = holder.slice(2, -2)
        const safe = trimmed.replace(SAFE_NAME, ' ')
        const value = output[safe] ?? output[trimmed]

        history = history.split(holder).join(value ?? '')
      }
    }

    return { values: output, response, history }
  }

  return hydrate
}

export function getSubscriptionModelLimits(
  model:
    | Pick<AppSchema.SubscriptionModel, 'subLevel' | 'levels' | 'maxContextLength' | 'maxTokens'>
    | undefined,
  level: number
) {
  if (!model) return

  const levels = Array.isArray(model.levels) ? model.levels.slice() : []

  levels.push({
    level: model.subLevel,
    maxContextLength: model.maxContextLength!,
    maxTokens: model.maxTokens,
  })

  let match: AppSchema.SubscriptionModelLevel | undefined

  for (const candidate of levels) {
    if (candidate.level > level) continue

    if (!match || match.level < candidate.level) {
      match = candidate
      continue
    }
  }

  return match
}
