export function toArray<T>(values?: T | T[]): T[] {
  if (values === undefined) return []
  if (Array.isArray(values)) return values
  return [values]
}

export function wait(secs: number) {
  return new Promise((res) => setTimeout(res, secs * 1000))
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
    return `${days} days`
  }

  if (hours) {
    return `${hours} hours`
  }

  if (minutes) {
    return `${minutes} mins`
  }

  return `${seconds} seconds`
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

export function indexOfAnyOf(haystack: string, needles: string[]): number {
  const indices = needles
    .map((needle) => haystack.indexOf(needle))
    .filter((result) => result !== -1)
    .sort((a, b) => a - b)
  return indices[0] ?? -1
}
