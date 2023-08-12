import { AdapterOptions, AIAdapter, RegisteredAdapter } from '../../common/adapters'
import { config } from '../config'
import { logger } from '../logger'
import { ModelAdapter } from './type'

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
  })
}

export function getRegisteredAdapters() {
  const all = Array.from(adapters.values()).filter(filterAdapter)
  return all
}

export function getRegisteredAdapter(name: AIAdapter): RegisteredAdapter | undefined {
  return adapters.get(name)
}

function filterAdapter(adp: RegisteredAdapter) {
  return config.adapters.includes(adp.name)
}
