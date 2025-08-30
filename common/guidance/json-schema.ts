import { AppSchema } from '../types'
import { ResponseSchema } from '../types/library'
import { JsonField } from '../prompt'
import { GenerationConfig, Schema, Type } from '@google/genai'

export const SCHEMA_VARS = {
  user: `Your name: unformatted`,
  snake_user: `Your name: snake_case`,
  kebab_user: `Your name: kebab-case`,

  char: `Character name: unformatted`,
  snake_char: `Character name: snake_case`,
  kebab_char: `Character name: kebab-case`,
}

export type StructureEntities = {
  replyAs: M<AppSchema.Character>
  char: AppSchema.Character
  impersonate?: M<AppSchema.Character>
  sender: M<AppSchema.Profile>
}

type M<T> = T | undefined

/**
 * @destructive Mutates `schema` field names and templates if required
 */
export function formatJsonSchemaVars(schema: ResponseSchema, ents: StructureEntities) {
  if (!schema?.schema?.length) return
  schema.history = parseVariableName(schema.history, ents)
  schema.response = parseVariableName(schema.response, ents)
  for (const field of schema.schema) {
    field.name = parseVariableName(field.name, ents)
  }
  return
}

type GeminiResponseSchema = NonNullable<GenerationConfig['responseSchema']>

type JsonSchemaFormat = 'openai' | 'guided_json' | 'gemini'

type OutboundJsonSchema<T extends JsonSchemaFormat> = T extends 'openai'
  ? {
      type: 'json_schema'
      json_schema: {
        name: string
        type: string
        strict: boolean
        schema: {
          strict: boolean
          properties: Record<string, any>
          required: string[]
          additionalProperties: boolean
        }
      }
    }
  : T extends 'gemini'
  ? GeminiResponseSchema
  : {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }

export function getJsonSchemaPayload<T extends JsonSchemaFormat>(
  json: JsonField[],
  format: T,
  entities: StructureEntities
): OutboundJsonSchema<T> {
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
      const payload: OutboundJsonSchema<'openai'> = {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          type: 'object',
          strict: true,
          schema: {
            strict: true,
            properties: fields,
            required,
            additionalProperties: false,
          },
        },
      }
      return payload as OutboundJsonSchema<T>
    }

    case 'gemini': {
      const payload: OutboundJsonSchema<'gemini'> = toResponseSchema(json, entities)
      return payload as OutboundJsonSchema<T>
    }

    case 'guided_json': {
      const payload: OutboundJsonSchema<'guided_json'> = {
        type: 'object',
        properties: fields,
        required,
      }
      return payload as OutboundJsonSchema<T>
    }
  }
}

function toResponseSchema(fields: JsonField[], entities: StructureEntities) {
  const response = getResponseVariable(entities)

  const schema: GeminiResponseSchema = {
    type: Type.OBJECT,
    properties: {},
    propertyOrdering: [response].concat(fields.map((f) => f.name)),
    required: [response].concat(fields.map((f) => f.name)),
  }

  const properties: Record<string, Schema> = {
    [response]: { type: Type.STRING, description: response },
  }

  for (const entry of fields) {
    switch (entry.type.type) {
      case 'string': {
        properties[entry.name] = {
          type: Type.STRING,
          description: entry.name,
          maxLength: +entry.type.maxLength! > 0 ? `${entry.type.maxLength}` : undefined,
        }
        continue
      }

      case 'integer': {
        properties[entry.name] = {
          type: Type.INTEGER,
          description: entry.name,
        }
        continue
      }

      case 'enum': {
        properties[entry.name] = {
          type: Type.STRING,
          description: entry.name,
          enum: entry.type.enum,
        }
        continue
      }

      case 'bool': {
        properties[entry.name] = {
          description: entry.name,
          type: Type.BOOLEAN,
        }
        continue
      }
    }
  }

  schema.properties = properties

  return schema
}

export function getResponseVariable(entities: StructureEntities) {
  const { char } = getNames(entities)
  return `${char}'s response`
}

function getNames(entities: StructureEntities) {
  const char = entities.replyAs?.name || entities.char?.name || 'Bot'
  const user = entities.impersonate?.name || entities.sender?.handle || 'You'
  return { char, user }
}

export function parseVariableName(varname: string, opts: StructureEntities) {
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
