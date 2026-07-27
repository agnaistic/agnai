import { AppSchema } from './types'

export const SCENE_CLOCK_UPDATE_TAG =
  /(?:<\s*)?scene[\s_-]*clock[\s_-]*update\s*>\s*([\s\S]*?)\s*(?:<\s*)?\/\s*scene[\s_-]*clock[\s_-]*update\s*>/gi

const SCENE_CLOCK_UPDATE_MARKDOWN =
  /^\s*\*{1,2}\s*scene[\s_-]*clock[\s_-]*update\s*\*{0,2}\s*(\{[^\n]*\})\s*\*{0,2}(?:\s*\n|$)/i

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
    const markdownUpdate = text.match(SCENE_CLOCK_UPDATE_MARKDOWN)
    if (markdownUpdate) {
      update = parseUpdateJson(markdownUpdate[1])
      text = text.slice(markdownUpdate[0].length)
    }
  }

  if (!update) {
    const leadingJson = text.match(/^\s*(\{[^\n]*\})(?:\s*\n|$)/)
    if (leadingJson) {
      const parsed = parseUpdateJson(leadingJson[1])
      if (parsed) {
        update = parsed
        text = text.slice(leadingJson[0].length)
      }
    }
  }

  // Keep accepting the previous end-of-response fallback for existing prompts and retries.
  if (!update) {
    const trailingJson = text.match(/(?:^|\n)\s*(\{[^\n]*\})\s*$/)
    if (trailingJson?.index !== undefined) {
      const parsed = parseUpdateJson(trailingJson[1])
      if (parsed) {
        update = parsed
        text = text.slice(0, trailingJson.index)
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
