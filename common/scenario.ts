import { AppSchema } from './types'

const eventTypes: Record<AppSchema.ScenarioEventType, boolean> = {
  character: true,
  hidden: true,
  ooc: true,
  world: true,
}

export function isScenarioEvent(event?: any): event is AppSchema.ScenarioEventType {
  if (typeof event !== 'string') return false
  if (!event.startsWith('send-event:')) return false

  const [, type] = event.split(':')
  return !!eventTypes[type as AppSchema.ScenarioEventType]
}

export function getScenarioEventType(event: string): AppSchema.ScenarioEventType | undefined {
  if (!event.startsWith('send-event')) return

  const [, type] = event.split(':') as AppSchema.ScenarioEventType[]

  return eventTypes[type] ? type : undefined
}
