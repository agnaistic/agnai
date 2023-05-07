/**
 * WIP
 */

import { AdapterOptions, AIAdapter } from '../../common/adapters'
import { logger } from '../logger'
import { ModelAdapter } from './type'

const adapters = new Map<
  string,
  { name: AIAdapter; handler: ModelAdapter; options: AdapterOptions }
>()

export function registerAdapter(name: AIAdapter, handler: ModelAdapter, options: AdapterOptions) {
  if (adapters.has(name)) {
    throw new Error(
      `Cannot start: Attempted to register adapter '${name}', but it has already been registered`
    )
  }

  logger.info(`Registered adapter: ${name}`)
  adapters.set(name, { name, handler, options })
}

export function getRegisteredAdapters() {
  const all = Array.from(adapters.values())
  return all
}
