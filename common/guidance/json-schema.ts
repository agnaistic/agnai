import { AppSchema } from '../types'
import { ResponseSchema } from '../types/library'
import { JsonField } from '../prompt'
import { GenerationConfig, Schema, Type } from '@google/genai'
import { jsonHydrator } from '../util'

export const SCHEMA_VARS = {
  user: `Your name: unformatted`,
  snake_user: `Your name: snake_case`,
  kebab_user: `Your name: kebab-case`,

  char: `Character name: unformatted`,
  snake_char: `Character name: snake_case`,
  kebab_char: `Character name: kebab-case`,
}

export type StructureEntities = {
  replyAs?: Pick<AppSchema.Character, 'name'>
  char: Pick<AppSchema.Character, 'name'>
  impersonate?: Pick<AppSchema.Character, 'name'>
  sender?: Pick<AppSchema.Profile, 'handle'>
}

/**
 * @destructive Mutates `schema` field names and templates if required
 */
export function formatJsonSchemaVars(
  schema: ResponseSchema,
  ents: StructureEntities
): ResponseSchema {
  if (!schema?.schema?.length) schema
  const aliases = getSchemaAliases(schema.schema)
  const history = parseVariableName(schema.history, ents, aliases)
  const response = parseVariableName(schema.response, ents, aliases)
  const imageCaption = parseVariableName(schema.imageCaption, ents, aliases)
  const fields = schema.schema.map((s) => ({ ...s }))

  for (const field of fields) {
    field.name = parseVariableName(field.name, ents, aliases)
  }

  return { history, response, imageCaption, schema: fields, separateCall: schema.separateCall }
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
  const base = {}
  // const base: any = {}
  const fields = json.reduce((prev: any, field: JsonField) => {
    let {
      type: { type, ...subtype },
    } = field

    if ('maxLength' in subtype) {
      subtype.maxLength = +(subtype.maxLength as any)
    }

    if (type === 'enum') {
      type = 'string'
    }

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

export function prepareJsonSchema(
  def: Ensure<AppSchema.Character['json']>,
  entities: StructureEntities,
  forceSeparate?: boolean
) {
  const names = getNames(entities)
  const aliases: Record<string, string> = {}
  const parsed = formatJsonSchemaVars(def, entities)
  const fields = parsed.schema.slice()

  if (!def.separateCall && !forceSeparate) {
    const responseVar = getResponseVariable(entities)
    fields.unshift({ type: { type: 'string', maxLength: 0 }, name: responseVar, disabled: false })
    aliases[responseVar] = 'response'
  }

  const nextSchema: ResponseSchema = {
    response: parsed.response,
    history: parsed.history,
    imageCaption: parsed.imageCaption,
    schema: fields,
    separateCall: def.separateCall,
  }

  const hydrator = jsonHydrator(nextSchema, aliases)

  return {
    names,
    hydrator,
    aliases,
    ...nextSchema,
  }
}

function getNames(entities: StructureEntities) {
  const char = entities.replyAs?.name || entities.char?.name || 'Bot'
  const user = entities.impersonate?.name || entities.sender?.handle || 'You'
  return { char, user }
}

export function parseVariableName(
  varname: string,
  opts: StructureEntities,
  aliases: Record<string, string>
) {
  const fieldName = aliases[varname] || varname
  const user = opts.impersonate?.name || opts.sender?.handle || 'You'
  const char = opts.replyAs?.name || opts.char?.name || 'Bot'

  const parsed = formatPlaceholder(formatPlaceholder(fieldName, 'user', user), 'char', char)
  return parsed
}

function formatPlaceholder(varname: string, entity: 'user' | 'char', entityName: string) {
  const snake = entityName.replace(/ +/g, '_')
  const kebab = entityName.replace(/ +/g, '-')

  switch (entity) {
    case 'char': {
      const formatted = (varname || '')
        .replace(/%snake_char%/gi, snake)
        .replace(/%kebak_char%/gi, kebab)
        .replace(/%char%/gi, entityName)
      return formatted
    }

    case 'user': {
      const formatted = (varname || '')
        .replace(/%snake_user%/gi, snake)
        .replace(/%kebak_user%/gi, snake)
        .replace(/%user%/gi, entityName)
      return formatted
    }
  }
}

export function getSchemaAliases(fields: JsonField[]) {
  const aliases: Record<string, string> = {}

  for (const field of fields) {
    if (field.alias) {
      aliases[field.alias] = field.name
    }
  }

  return aliases
}
