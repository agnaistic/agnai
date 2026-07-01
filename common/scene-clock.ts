import { AppSchema } from './types'

export const SCENE_CLOCK_UPDATE_TAG =
  /<scene_clock_update>\s*([\s\S]*?)\s*<\/scene_clock_update>/gi

type SceneClockUpdate = Partial<
  Pick<AppSchema.SceneClock, 'date' | 'time' | 'dayOfWeek' | 'calendarName' | 'notes'>
>

export function parseSceneClockUpdate(response: string): {
  text: string
  update?: SceneClockUpdate
} {
  let update: SceneClockUpdate | undefined
  let text = response.replace(SCENE_CLOCK_UPDATE_TAG, (_, json: string) => {
    const parsed = parseUpdateJson(json)
    if (parsed) update = parsed
    return ''
  })

  if (!update) {
    const bareJson = text.match(/(?:^|\n)\s*(\{[^\n]*\})\s*$/)
    if (bareJson?.index !== undefined) {
      const parsed = parseUpdateJson(bareJson[1])
      if (parsed) {
        update = parsed
        text = text.slice(0, bareJson.index)
      }
    }
  }

  return {
    text: text.replace(/[ \t]+\n/g, '\n').trim(),
    update,
  }
}

function parseUpdateJson(value: string): SceneClockUpdate | undefined {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return

    const update: SceneClockUpdate = {}
    for (const key of ['date', 'time', 'dayOfWeek', 'calendarName', 'notes'] as const) {
      const next = parsed[key]
      if (next === undefined) continue
      if (typeof next !== 'string') return
      update[key] = next.trim()
    }

    return Object.keys(update).length ? update : undefined
  } catch {
    return
  }
}
