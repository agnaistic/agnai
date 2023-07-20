import { UnwrapBody, Validator } from './types'
import {
  isObjectOptional,
  isOptionalArray,
  isOptionalPrimitive,
  isOptionalUnion,
  isPrimitive,
  isTupleBody,
  isTupleOptional,
  isTuplePrimitive,
  isUnion,
} from './util'

export function isValid<T extends Validator>(type: T, compare: any): compare is UnwrapBody<T> {
  const errors = validateBody(type, compare, { notThrow: true })
  return errors.length === 0
}

export function assertValid<T extends Validator>(
  type: T,
  compare: any,
  partial?: boolean
): asserts compare is UnwrapBody<T> {
  const errors = validateBody(type, compare, { notThrow: true, partial })
  if (errors.length) {
    throw new Error(`Request body is invalid: ${errors.join(', ')}`)
  }
}

export function isValidPartial<T extends Validator>(
  type: T,
  compare: any
): compare is Partial<UnwrapBody<T>> {
  const errors = validateBody(type, compare, { notThrow: true, partial: true })
  return errors.length === 0
}

export function validateBody<T extends Validator>(
  type: T,
  compare: any,
  opts: { partial?: boolean; prefix?: string; notThrow?: boolean } = {}
) {
  const prefix = opts.prefix ? `${opts.prefix}.` : ''
  const errors: string[] = []

  if (!compare && '?' in type && (type as any)['?'] === '?') {
    return errors
  }

  start: for (const key in type) {
    const prop = `${prefix}${key}`
    const bodyType = type[key]
    let value
    try {
      value = compare?.[key]
    } catch (ex: any) {
      throw new Error(`${ex.message}: ${prop}`)
    }

    if (value === undefined) {
      if (isOptionalPrimitive(bodyType)) continue
      if (isTupleOptional(bodyType)) continue
      if (isOptionalArray(bodyType)) continue
      if (isObjectOptional(bodyType)) continue
      if (isOptionalUnion(bodyType)) continue
      if ((key as any) === '?' && (bodyType as any) === '?') continue
      if (!opts.partial) errors.push(`.${prop} is undefined`)
      continue
    }

    if (bodyType === 'any' || bodyType === 'unknown' || (bodyType as any) === '?') continue

    if (isPrimitive(bodyType) && typeof value !== bodyType) {
      errors.push(`.${prop} is ${typeof value}, expected ${bodyType}`)
      continue
    }

    if (isOptionalPrimitive(bodyType)) {
      // We have already checked this, but harmless to check again
      if (value === undefined) continue

      const actual = bodyType.slice(0, -1)
      if (actual === 'any' || actual === 'unknown') continue
      if (typeof value !== actual)
        errors.push(`.${prop} is ${typeof value}, expected ${actual} or undefined`)
      continue
    }

    if (isTuplePrimitive(bodyType)) {
      const [innerType] = bodyType
      if (!Array.isArray(value)) {
        errors.push(`.${prop} is ${typeof value}, expected Array<${innerType}>`)
        continue start
      }

      if (innerType === 'any' || innerType === 'unknown') continue
      for (const tupleValue of value) {
        if (typeof tupleValue === innerType) continue

        // We will exit on the first mismatch
        // We could report all distinct erronous types?
        errors.push(`.${prop} element contains ${typeof tupleValue}, expected ${innerType}`)
        continue start
      }
      continue
    }

    if (isTupleOptional(bodyType)) {
      if (value === undefined) continue

      const [innerType] = bodyType
      const actual = innerType.slice(0, -1)

      if (!Array.isArray(value)) {
        errors.push(`.${prop} is ${typeof value}, expected Array<${actual}> or undefined`)
        continue start
      }

      if (actual === 'any' || actual === 'unknown') continue
      for (const tupleValue of value) {
        if (typeof tupleValue === actual) continue

        // We will exit on the first mismatch
        // We could report all distinct erronous types?
        errors.push(`.${prop} element contains ${typeof tupleValue}, expected ${actual}`)
        continue start
      }
      continue
    }

    if (isTupleBody(bodyType)) {
      const [innerBody, opt] = bodyType
      if (!value && opt === '?') continue

      if (!Array.isArray(value)) {
        errors.push(`.${prop} is ${typeof value}, expected Array`)
        continue start
      }

      for (const tupleValue of value) {
        if (typeof tupleValue !== 'object') {
          errors.push(`.${prop} element contains ${typeof tupleValue}, expected object`)
          continue start
        }

        const innerErrors = validateBody(innerBody, tupleValue, {
          prefix: prop,
          notThrow: true,
          partial: opts.partial,
        })
        if (!innerErrors.length) continue
        errors.push(...innerErrors)
        continue start
      }

      continue
    }

    if (isOptionalUnion(bodyType)) {
      if (value === null || value === undefined) continue

      if (typeof value !== 'string') {
        errors.push(
          `.${prop} is ${typeof value}, expected undefined or literal of ${bodyType
            .filter((v) => v !== null)
            .join(' | ')}`
        )
        continue start
      }

      if (bodyType.includes(value) === false) {
        errors.push(
          `.${prop} value is invalid, expected undefined or literal of ${bodyType
            .filter((v) => v !== null)
            .join(' | ')}`
        )
        continue start
      }

      continue
    }
    if (isUnion(bodyType)) {
      if (typeof value !== 'string') {
        errors.push(`.${prop} is ${typeof value}, expected literal of ${bodyType.join(' | ')}`)
        continue start
      }

      if (bodyType.includes(value) === false) {
        errors.push(`.${prop} value is invalid, expected literal of ${bodyType.join(' | ')}`)
        continue start
      }

      continue
    }

    if (typeof bodyType === 'object') {
      if (typeof value !== 'object') {
        errors.push(`${prop} is ${typeof value}, expected object`)
        continue
      }

      const innerErrors = validateBody(bodyType as any, value, {
        prefix: prop,
        partial: opts.partial,
        notThrow: true,
      })
      errors.push(...innerErrors)
      continue
    }
  }

  if (!opts.notThrow) {
    throw new Error(`Object does not match type: ${errors.join(', ')}`)
  }

  return errors
}
