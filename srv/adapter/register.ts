import { AdapterOptions, AIAdapter, RegisteredAdapter } from '../../common/adapters'
import { config } from '../config'
import { logger } from '../middleware'
import { ModelAdapter } from './type'
import { AppSchema } from '/common/types'

const adapters = new Map<AIAdapter, RegisteredAdapter & { handler: ModelAdapter }>()

export function registerAdapter(name: AIAdapter, handler: ModelAdapter, options: AdapterOptions) {
  if (adapters.has(name)) {
    throw new Error(
      `Cannot start: Attempted to register adapter '${name}', but it has already been registered`
    )
  }

  logger.info(`Registered adapter: ${name}`)
  adapters.set(name, {
    name,
    handler,
    options: options.options,
    settings: options.settings,
    load: options.load,
  })
}

export function getRegisteredAdapters(user?: AppSchema.User | null) {
  const all = Array.from(adapters.values())
    .filter((a) => filterAdapter(a, user))
    .map((adp) => {
      const settings = adp.load?.(user) ?? adp.settings
      return { ...adp, settings }
    })

  return all
}

export function getRegisteredAdapter(name: AIAdapter): RegisteredAdapter | undefined {
  return adapters.get(name)
}

function filterAdapter(adp: RegisteredAdapter, user?: AppSchema.User | null) {
  const included = config.adapters.includes(adp.name)
  return included
}
