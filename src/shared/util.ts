import { UnwrapBody, assertValid } from 'frisker'

type FormRef = { [key: string]: 'string' | 'string?' }

export function getForm<T = {}>(evt: Event): T {
  evt.preventDefault()
  const form = new FormData(evt.target as HTMLFormElement)
  const body = Array.from(form.entries()).reduce((prev, [key, value]) => {
    Object.assign(prev, { [key]: value })
    return prev
  }, {})

  return body as any
}

export function getStrictForm<T extends FormRef>(evt: Event, body: T) {
  evt.preventDefault()
  const target = evt.target
  const form = new FormData(target as HTMLFormElement)

  const values = Object.keys(body).reduce((prev, curr) => {
    const value = form.get(curr)?.toString()
    prev[curr] = value
    return prev
  }, {} as any) as UnwrapBody<T>

  assertValid(body, values)
  return values
}

export function getFormEntries(evt: Event): Array<[string, string]> {
  evt.preventDefault()
  const form = new FormData(evt.target as HTMLFormElement)
  return Array.from(form.entries()).map(([key, value]) => [key, value.toString()])
}
