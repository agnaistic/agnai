import { AppSchema } from '../types'
import { ResponseSchema } from '../types/library'
import { JsonField } from '../prompt'

export const SCHEMA_VARS = {
  user: `Your name: unformatted`,
  snake_user: `Your name: snake_case`,
  kebab_user: `Your name: kebab-case`,

  char: `Character name: unformatted`,
  snake_char: `Character name: snake_case`,
  kebab_char: `Character name: kebab-case`,
}

type Entities = {
  replyAs: M<AppSchema.Character>
  char: AppSchema.Character
  impersonate: M<AppSchema.Character>
  sender: M<AppSchema.Profile>
}

type M<T> = T | undefined

/**
 * @destructive Mutates `schema` field names and templates if required
 */
export function formatJsonSchemaVars(schema: ResponseSchema, ents: Entities) {
  if (!schema?.schema?.length) return
  schema.history = parseVariableName(schema.history, ents)
  schema.response = parseVariableName(schema.response, ents)
  for (const field of schema.schema) {
    field.name = parseVariableName(field.name, ents)
  }
  return
}

export function getJsonSchemaPayload(
  json: JsonField[],
  format: 'openai' | 'guided_json',
  entities: Entities
) {
  const response = getResponseVariable(entities)

  const base = { [response]: { type: 'string' } }
  // const base: any = {}
  const fields = json.reduce((prev: any, field: JsonField) => {
    const {
      type: { type, ...subtype },
    } = field

    const spec: any = { type, ...subtype }
    if (spec.maxLength !== undefined && spec.maxLength <= 0) {
      delete spec.maxLength
    }

    prev[field.name] = spec
    return prev
  }, base as any)
  const required = Object.keys(fields)

  switch (format) {
    case 'openai': {
      const payload = {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          type: 'object',
          strict: true,
          // name: 'response',
          schema: {
            strict: true,
            properties: fields,
            required,
            additionalProperties: false,
          },
        },
      }
      return payload
    }

    case 'guided_json': {
      const payload = {
        type: 'object',
        properties: fields,
        required,
      }
      return payload
    }
  }
}

export function getResponseVariable(entities: Entities) {
  const { char } = getNames(entities)
  return `${char}'s response`
}

function getNames(entities: Entities) {
  const char = entities.replyAs?.name || entities.char?.name || 'Bot'
  const user = entities.impersonate?.name || entities.sender?.handle || 'You'
  return { char, user }
}

function parseVariableName(varname: string, opts: Entities) {
  const user = opts.impersonate?.name || opts.sender?.handle || 'You'
  const char = opts.replyAs?.name || opts.char?.name || 'Bot'

  const parsed = formatPlaceholder(formatPlaceholder(varname, 'user', user), 'char', char)
  return parsed
}

function formatPlaceholder(varname: string, entity: 'user' | 'char', entityName: string) {
  const snake = entityName.replace(/ +/g, '_')
  const kebab = entityName.replace(/ +/g, '-')

  switch (entity) {
    case 'char': {
      const formatted = varname
        .replace(/%snake_char%/gi, snake)
        .replace(/%kebak_char%/gi, kebab)
        .replace(/%char%/gi, entityName)
      return formatted
    }

    case 'user': {
      const formatted = varname
        .replace(/%snake_user%/gi, snake)
        .replace(/%kebak_user%/gi, snake)
        .replace(/%user%/gi, entityName)
      return formatted
    }
  }
}
