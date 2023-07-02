import { createEffect, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AppSchema, VoiceSettings } from '/common/types'
import { FullSprite } from '/common/types/sprite'
import { defaultCulture } from '/web/shared/CultureCodes'
import { PERSONA_FORMATS } from '/common/adapters'
import { getStrictForm, setFormField } from '/web/shared/util'
import { getAttributeMap } from '/web/shared/PersonaAttributes'
import { NewCharacter } from '/web/store'
import { getImageData } from '/web/store/data/chars'

type CharKey = keyof NewCharacter
type GuardKey = keyof typeof newCharGuard

type EditState = {
  editId?: string
  name: string
  personaKind: AppSchema.Character['persona']['kind']
  description: string
  appearance: string
  scenario: string
  greeting: string
  sampleChat: string
  creator: string
  characterVersion: string
  postHistoryInstructions: string
  systemPrompt: string

  visualType: string
  avatar?: File
  sprite?: FullSprite

  tags: string[]
  book?: AppSchema.MemoryBook
  voice: VoiceSettings
  culture: string
  alternateGreetings: string[]
  persona: AppSchema.Persona
}

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

const fieldMap: Map<CharKey, GuardKey | 'tags'> = new Map([
  ['name', 'name'],
  ['appearance', 'appearance'],
  ['description', 'description'],
  ['greeting', 'greeting'],
  ['sampleChat', 'sampleChat'],
  ['creator', 'creator'],
  ['characterVersion', 'characterVersion'],
  ['postHistoryInstructions', 'postHistoryInstructions'],
  ['scenario', 'scenario'],
  ['systemPrompt', 'systemPrompt'],
  ['tags', 'tags'],
  ['name', 'name'],
  ['description', 'description'],
  ['scenario', 'scenario'],
  ['greeting', 'greeting'],
  ['creator', 'creator'],
  ['characterVersion', 'characterVersion'],
  ['postHistoryInstructions', 'postHistoryInstructions'],
  ['systemPrompt', 'systemPrompt'],
])

const initState: EditState = {
  name: '',
  personaKind: 'text',
  sampleChat: '',
  description: '',
  appearance: '',
  scenario: '',
  greeting: '',
  creator: '',
  characterVersion: '',
  postHistoryInstructions: '',
  systemPrompt: '',

  visualType: 'avatar',
  tags: [],
  alternateGreetings: [],
  culture: defaultCulture,
  voice: { service: undefined },
  sprite: undefined,
  book: undefined,
  persona: { kind: 'text', attributes: { text: [''] } },
}

export function useCharEditor(editing?: NewCharacter & { _id?: string }) {
  const [original, setOriginal] = createSignal(editing)
  const [state, setState] = createStore<EditState>({ ...initState })
  const [imageData, setImageData] = createSignal<string>()

  createEffect(async () => {
    const file = state.avatar || original()?.originalAvatar
    if (!file) {
      setImageData(undefined)
      return
    }

    const data = await getImageData(file)
    setImageData(data)
  })

  createEffect(() => {
    if (!editing) return

    const orig = original()
    if (!orig || orig._id !== editing._id) {
      setOriginal(editing)
    }
  })

  const reset = (ref: any) => {
    const char = original()
    setState({ ...initState })

    const personaKind = char?.persona.kind || state.personaKind
    for (const [key, field] of fieldMap.entries()) {
      if (!char) setFormField(ref, field, '')
      else setFormField(ref, field, char[key] || '')
    }

    setState('personaKind', personaKind)
    setFormField(ref, 'kind', personaKind)

    // We set fields that aren't properly managed by form elements
    setState({
      ...char,
      personaKind,
      alternateGreetings: char?.alternateGreetings || [],
      book: char?.characterBook,
      voice: char?.voice || { service: undefined },
      sprite: char?.sprite || undefined,
      visualType: char?.visualType || 'avatar',
      culture: char?.culture || defaultCulture,
    })
    console.log('Setting sprite', state.sprite)
  }

  const load = (ref: any, char: NewCharacter | AppSchema.Character) => {
    if ('_id' in char) {
      const { avatar, ...incoming } = char
      setOriginal({ ...incoming, originalAvatar: avatar })
      reset(ref)
      return
    }

    setOriginal(char)
    reset(ref)
  }

  const payload = (ref: any) => {
    return getPayload(ref, state, original())
  }

  const convert = (ref: any): AppSchema.Character => {
    const payload = getPayload(ref, state, original())

    return {
      _id: '',
      kind: 'character',
      userId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload,
      avatar: imageData(),
    }
  }

  return { state, update: setState, reset, load, convert, payload, original }
}

function getPayload(ev: any, state: EditState, original?: NewCharacter) {
  const body = getStrictForm(ev, newCharGuard)
  const attributes = getAttributeMap(ev)

  const persona = {
    kind: body.kind,
    attributes,
  }

  const payload = {
    name: body.name,
    description: body.description,
    culture: body.culture,
    tags: state.tags,
    scenario: body.scenario,
    appearance: body.appearance,
    visualType: state.visualType,
    avatar: state.avatar ?? (null as any),
    sprite: state.sprite ?? (null as any),
    greeting: body.greeting,
    sampleChat: body.sampleChat,
    originalAvatar: original?.originalAvatar,
    voice: state.voice,

    // New fields start here
    systemPrompt: body.systemPrompt ?? '',
    postHistoryInstructions: body.postHistoryInstructions ?? '',
    alternateGreetings: state.alternateGreetings ?? [],
    characterBook: state.book,
    creator: body.creator ?? '',
    extensions: original?.extensions,
    characterVersion: body.characterVersion ?? '',
    persona: {
      kind: state.personaKind,
      attributes: persona.attributes,
    },
  }

  return payload
}
