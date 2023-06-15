export type FromTupleLiteral<T> = T extends [...string[], null] | readonly [...string[], null]
  ? Exclude<T[number], null> | undefined
  : T extends [...string[]] | readonly [...string[]]
  ? T[number]
  : never

export type OptionalToPrimitive<T extends OptionalPrimitive> = T extends 'string?'
  ? string
  : T extends 'number?'
  ? number
  : T extends 'boolean?'
  ? boolean
  : never
export type OptionalPrimitive = 'string?' | 'number?' | 'boolean?' | 'any?' | 'unknown?'
export type Primitive = 'string' | 'number' | 'boolean' | 'any' | 'unknown'

export type Reference =
  | OptionalPrimitive
  | Primitive
  | readonly [Primitive]
  | [Primitive]
  | readonly [Validator]
  | readonly [Validator, '?']
  | [Validator]
  | [Validator, '?']
  | Validator
  | (Validator & { '?': any })
  | [...string[]]
  | readonly [...string[]]
  | [...string[], null]
  | readonly [...string[], null]

export type Validator = { [key: string]: Reference } | { readonly [key: string]: Reference }

export type FromOptional<T extends OptionalPrimitive> = T extends 'string?'
  ? string | undefined
  : T extends 'boolean?'
  ? boolean | undefined
  : T extends 'number?'
  ? number | undefined
  : T extends 'any?'
  ? any | undefined
  : T extends 'unknown?'
  ? unknown | undefined
  : never

export type FromPrimitve<T extends Primitive> = T extends 'string'
  ? string
  : T extends 'boolean'
  ? boolean
  : T extends 'number'
  ? number
  : T extends 'any'
  ? any
  : T extends 'unknown'
  ? unknown
  : never

export type FromTuple<T> = T extends
  | [infer U]
  | readonly [infer U]
  | [infer U, '?']
  | readonly [infer U, '?']
  ? U extends Primitive
    ? T extends [U, '?'] | readonly [U, '?']
      ? Array<FromPrimitve<U>> | undefined
      : Array<FromPrimitve<U>>
    : never
  : never

export type FromOptionalTuple<T> = T extends [infer U] | readonly [infer U]
  ? U extends OptionalPrimitive
    ? Array<OptionalToPrimitive<U>> | undefined
    : never
  : never

export type FromTupleBody<T> = T extends [infer U, infer O]
  ? U extends Validator
    ? O extends '?'
      ? Array<UnwrapBody<U>> | undefined
      : Array<UnwrapBody<U>>
    : never
  : T extends readonly [infer U]
  ? U extends Validator
    ? Array<UnwrapBody<U>>
    : never
  : never

export type UnwrapBody<T extends Validator> = {
  -readonly [key in keyof T]: key extends '?'
    ? never
    : T[key] extends Primitive
    ? FromPrimitve<T[key]>
    : T[key] extends OptionalPrimitive
    ? FromOptional<T[key]>
    : T[key] extends [Primitive, '?'] | readonly [Primitive, '?']
    ? FromTuple<T[key]>
    : T[key] extends [Primitive] | readonly [Primitive]
    ? FromTuple<T[key]>
    : T[key] extends [OptionalPrimitive] | readonly [OptionalPrimitive]
    ? FromOptionalTuple<T[key]>
    : T[key] extends [Validator, '?'] | readonly [Validator, '?']
    ? Array<UnwrapBody<T[key][0]>> | undefined
    : T[key] extends [Validator] | readonly [Validator]
    ? FromTupleBody<T[key]>
    : T[key] extends Validator & { '?': any }
    ? Omit<UnwrapBody<T[key]>, '?'> | undefined
    : T[key] extends Validator
    ? UnwrapBody<T[key]>
    : FromTupleLiteral<T[key]>
}
