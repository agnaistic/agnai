import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AppSchema, VoiceSettings } from '/common/types'
import { FullSprite } from '/common/types/sprite'
import { defaultCulture } from '/web/shared/CultureCodes'
import { PERSONA_FORMATS } from '/common/adapters'
import { setFormField } from '/web/shared/util'

export const newCharGuard = {
  kind: PERSONA_FORMATS,
  name: 'string',
  description: 'string?',
  appearance: 'string?',
  culture: 'string',
  greeting: 'string',
  scenario: 'string',
  sampleChat: 'string',
  systemPrompt: 'string',
  postHistoryInstructions: 'string',
  creator: 'string',
  characterVersion: 'string',
} as const

const initState: EditState = {
  visualType: 'avatar',
  tags: [],
  culture: defaultCulture,
  voice: { service: undefined },
}

type EditState = {
  visualType: string
  avatar?: File
  sprite?: FullSprite

  tags: string[]
  book?: AppSchema.MemoryBook
  voice: VoiceSettings
  culture: string
}

export function useCharEditor(editing?: AppSchema.Character) {
  const [original, setOriginal] = createSignal(editing)
  const [state, setState] = createStore<EditState>(initState)

  const reset = (ref) => {
    if (original()) {
    }
  }

  return { state, update: setState }
}

function emptyFields(ref: any) {
  const keys = Object.keys(newCharGuard) as Array<keyof typeof newCharGuard>
  for (const key of keys) {
    if (key === 'kind') {
      setFormField(ref, key, 'text')
    } else setFormField(ref, key, '')
  }
}
