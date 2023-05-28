export function toArray<T>(values?: T | T[]): T[] {
  if (values === undefined) return []
  if (Array.isArray(values)) return values
  return [values]
}
