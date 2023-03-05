import { UnwrapBody, assertValid } from 'frisker'
import { ADAPTER_LABELS, AIAdapter } from '../../common/adapters'
import { DropdownItem } from './Dropdown'

type FormRef = { [key: string]: 'string' | 'string?' | readonly string[] | 'number' | 'number?' }

export function getForm<T = {}>(evt: Event | HTMLFormElement): T {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const form = new FormData(target as HTMLFormElement)
  const body = Array.from(form.entries()).reduce((prev, [key, value]) => {
    Object.assign(prev, { [key]: value })
    return prev
  }, {})

  return body as any
}

export function getStrictForm<T extends FormRef>(evt: Event, body: T) {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const form = new FormData(target as HTMLFormElement)

  const values = Object.keys(body).reduce((prev, curr) => {
    const type = body[curr]
    let value: string | number | undefined = form.get(curr)?.toString()
    if ((type === 'number' || type === 'number?') && value !== undefined) {
      value = +value
    }
    prev[curr] = value
    return prev
  }, {} as any) as UnwrapBody<T>

  assertValid(body, values)
  return values
}

export function getFormEntries(evt: Event | HTMLFormElement): Array<[string, string]> {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const form = new FormData(target as HTMLFormElement)
  return Array.from(form.entries()).map(([key, value]) => [key, value.toString()])
}

export function formatDate(value: string | number | Date) {
  const date = new Date(value)
  const str = date.toString()
  const day = date.getDate()
  const month = str.slice(4, 7)
  const time = str.slice(16, 24)

  return `${month} ${day} ${time}`
}

export function toDuration(valueSecs: number | Date, full?: boolean) {
  if (valueSecs instanceof Date) {
    valueSecs = Math.round((Date.now() - valueSecs.valueOf()) / 1000)
  }

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
  const diff = Date.now() - new Date(date).valueOf() + offsetMs
  const elapsed = Math.floor(diff / 1000)
  if (elapsed < 60) return 'a moment'
  return toDuration(Math.floor(elapsed))
}

const ONE_HOUR = 3600
const ONE_DAY = 86400

type Duration = [number, number, number, number]

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

export function adaptersToOptions(adapters: AIAdapter[]): DropdownItem[] {
  return adapters.map((adp) => ({ label: ADAPTER_LABELS[adp], value: adp }))
}
