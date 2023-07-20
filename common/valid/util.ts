import { OptionalPrimitive, Primitive, Validator } from './types'

export function isPrimitive(value: any): value is Primitive {
  return (
    typeof value === 'string' &&
    (value === 'string' ||
      value === 'boolean' ||
      value === 'number' ||
      value === 'any' ||
      value === 'unknown')
  )
}

export function isOptionalPrimitive(value: any): value is OptionalPrimitive {
  return (
    value === 'string?' ||
    value === 'boolean?' ||
    value === 'number?' ||
    value === 'any?' ||
    value === 'unknown?'
  )
}

export function isTuplePrimitive(value: any): value is [Primitive] | readonly [Primitive] {
  if (Array.isArray(value) === false) return false
  if (value.length !== 1) return false
  if (!isPrimitive(value[0])) return false
  return true
}

export function isTupleOptional(
  value: any
): value is [OptionalPrimitive] | readonly [OptionalPrimitive] {
  if (Array.isArray(value) === false) return false
  if (value.length !== 1) return false
  if (!isOptionalPrimitive(value[0])) return false
  return true
}

export function isOptionalArray(value: any): value is [Validator, '?'] | readonly [Validator, '?'] {
  if (Array.isArray(value) === false) return false
  if (value.length !== 2) return false
  return value[1] === '?'
}

export function isObjectOptional(value: any): value is Validator & { '?': any } {
  return typeof value === 'object' && '?' in value && !!value['?']
}

export function isTupleBody(
  value: any
): value is [Validator] | readonly [Validator] | [Validator, '?'] | readonly [Validator, '?'] {
  if (Array.isArray(value) === false) return false
  if (value.length !== 1 && value.length !== 2) return false
  if (value.length === 2) return typeof value[0] === 'object' && value[1] === '?'
  return typeof value[0] === 'object'
}

export function isOptionalUnion<T extends string>(
  value: any
): value is T[] | readonly string[] | undefined {
  if (!Array.isArray(value)) return false
  if (value.length < 1) return false
  if (isPrimitive(value[0])) return false
  if (value.includes(null)) return true
  return false
}

export function isUnion<T extends string>(value: any): value is [T] | string[] | readonly string[] {
  if (Array.isArray(value) === false) return false
  if (value.length < 1) return false
  if (isPrimitive(value[0])) return false

  return true
}
