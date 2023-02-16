import { UnwrapBody, assertValid } from 'frisker'

type FormRef = { [key: string]: 'string' | 'string?' }

export function getForm<T extends FormRef>(evt: Event, body: T) {
  evt.preventDefault()
  if (!evt.target) return
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
