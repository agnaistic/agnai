import { AppSchema } from './types/schema'

export function replace<T extends { _id: string }>(id: string, list: T[], item: Partial<T>) {
  return list.map((li) => (li._id === id ? { ...li, ...item } : li))
}

export function findOne<T extends { _id: string }>(id: string, list: T[]): T | void {
  for (const item of list) {
    if (item._id === id) return item
  }
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

const ONE_HOUR = 3600
const ONE_DAY = 86400

type Days = number
type Hours = number
type Minutes = number
type Seconds = number

type Duration = [Days, Hours, Minutes, Seconds]

function toRawDuration(valueSecs: number) {
  const days = Math.floor(valueSecs / ONE_DAY)
  const hours = Math.floor(valueSecs / ONE_HOUR) % 24
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

const end = `."'*!?)}]\``.split('')
export function trimSentence(text: string) {
  const last = end.reduce((last, char) => {
    const index = text.lastIndexOf(char)
    return index > last ? index : last
  }, -1)

  if (last === -1) return text
  return text.slice(0, last + 1)
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

export function getBotName(
  chat: AppSchema.Chat,
  msg: AppSchema.ChatMessage,
  chars: Record<string, AppSchema.Character>,
  replyAs: AppSchema.Character,
  main: AppSchema.Character,
  impersonate?: AppSchema.Character
) {
  if (!msg.characterId) return replyAs?.name || main.name
  if (msg.characterId.startsWith('temp-')) {
    const temp = chat.tempCharacters?.[msg.characterId]
    if (!temp) return main.name
    return temp.name
  }

  const char =
    msg.characterId && impersonate?._id === msg.characterId ? impersonate : chars[msg.characterId]

  if (!char) {
    return main.name
  }

  return char.name
}

export function eventGenerator<T = any>() {
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
  return new Date().toISOString()
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
  let copy: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (copyables[typeof value] || !value) {
      copy[key] = value
      continue
    }

    copy[key] = deepClone(value)
  }

  return copy
}

export function getUserSubscriptionTier(user: AppSchema.User, tiers: AppSchema.SubscriptionTier[]) {
  let nativeTier = tiers.find((t) => user.sub && t._id === user.sub.tierId)
  let patronTier = tiers.find((t) => user.patreon?.sub && t._id === user.patreon.sub.tierId)

  const nativeExpired = isExpired(user.billing?.validUntil) || user.billing?.status === 'cancelled'
  const patronExpired =
    isExpired(user.patreon?.member?.attributes.next_charge_date) ||
    user.patreon?.member?.attributes.patron_status !== 'active_patron'

  if (nativeExpired) {
    nativeTier = undefined
  }

  if (patronExpired) {
    patronTier = undefined
  }

  if (!nativeTier && !patronTier) return

  if (!nativeTier || !patronTier) {
    const tier = nativeTier || patronTier
    const level = tier!.level
    const type: 'native' | 'patreon' = nativeTier ? 'native' : 'patreon'

    return { tier: tier!, level, type }
  }

  const type: 'native' | 'patreon' = nativeTier.level >= patronTier.level ? 'native' : 'patreon'
  const tier = type === 'native' ? nativeTier : patronTier
  const level = tier.level

  return { type, tier, level }
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return true

  const expires = new Date(expiresAt).valueOf()
  if (Date.now() > expires) return true
  return false
}

export function isPastDate(date: Date | string) {
  const ms = typeof date === 'string' ? new Date(date).valueOf() : date.valueOf()

  if (Date.now() > ms) return true
  return false
}
