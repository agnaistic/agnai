export function toArray<T>(values?: T | T[]): T[] {
  if (values === undefined) return []
  if (Array.isArray(values)) return values
  return [values]
}

export function wait(secs: number) {
  return new Promise((res) => setTimeout(res, secs * 1000))
}
export const isObject = (val: unknown) => Object.prototype.toString.call(val) === '[object Object]'
