import { AppSchema } from '../types'
import { ResponseSchema } from '../types/library'

export const SCHEMA_VARS = {
  user: `Your name: unformatted`,
  snake_user: `Your name: snake_case`,
  kebab_user: `Your name: kebab-case`,

  char: `Character name: unformatted`,
  snake_char: `Character name: snake_case`,
  kebab_char: `Character name: kebab-case`,
}

/**
 * @destructive Mutates `schema` field names and templates if required
 */
export function formatJsonSchemaVars(
  schema: ResponseSchema,
  ents: { char: AppSchema.Character; impersonate?: AppSchema.Character; handle: string }
) {
  if (!schema?.schema?.length) return
  schema.history = parseVariableName(schema.history, ents)
  schema.response = parseVariableName(schema.response, ents)
  for (const field of schema.schema) {
    field.name = parseVariableName(field.name, ents)
  }
  return
}

function parseVariableName(
  varname: string,
  opts: { char: AppSchema.Character; impersonate?: AppSchema.Character; handle: string }
) {
  const user = opts.impersonate?.name || opts.handle || 'You'
  const parsed = formatPlaceholder(formatPlaceholder(varname, 'user', user), 'char', opts.char.name)
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
