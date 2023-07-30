import { createEffect, createMemo, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AppSchema, VoiceSettings } from '/common/types'
import { FullSprite } from '/common/types/sprite'
import { defaultCulture } from '/web/shared/CultureCodes'
import {
  ADAPTER_LABELS,
  AIAdapter,
  NOVEL_MODELS,
  OPENAI_MODELS,
  PERSONA_FORMATS,
} from '/common/adapters'
import { getStrictForm, setFormField } from '/web/shared/util'
import { getAttributeMap } from '/web/shared/PersonaAttributes'
import { NewCharacter, characterStore, presetStore, toastStore, userStore } from '/web/store'
import { getImageData } from '/web/store/data/chars'
import { Option } from '/web/shared/Select'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { GenField, generateChar, regenerateCharProp } from './generate-char'

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
  const user = userStore()
  const presets = presetStore()
  const [original, setOriginal] = createSignal(editing)
  const [state, setState] = createStore<EditState>({ ...initState })
  const [imageData, setImageData] = createSignal<string>()

  const genOptions = createMemo(() => {
    if (!user.user) return []

    const preset = isDefaultPreset(user.user.defaultPreset)
      ? defaultPresets[user.user.defaultPreset]
      : presets.presets.find((p) => p._id === user.user?.defaultPreset)

    const opts: Option[] = []

    if (preset?.service) {
      const model = getModelForService(preset.service!)
      const value = model ? `${preset.service}/${model}` : preset.service!
      opts.push({ label: `Default (${ADAPTER_LABELS[preset.service!]})`, value })
    }

    if (user.user.oaiKeySet) {
      opts.push({ label: 'OpenAI - Turbo', value: 'openai/gpt-3.5-turbo-0301' })
      opts.push({ label: 'OpenAI - GPT-4', value: 'openai/gpt-4' })
    }

    if (user.user.novelVerified) {
      opts.push({ label: 'NovelAI - Kayra', value: 'novel/kayra-v1' })
      opts.push({ label: 'NovelAI - Clio', value: 'novel/clio-v1' })
    }

    if (preset?.service === 'kobold' || user.user.koboldUrl) {
      opts.push({ label: 'Third Party', value: 'kobold' })
    }

    if (user.user.claudeApiKeySet) {
      opts.push({ label: 'Claude', value: 'claude' })
    }

    return opts
  })

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

  const createAvatar = async (ref: any) => {
    const char = payload(ref)
    const avatar = await generateAvatar(char)

    if (avatar) {
      setImageData(avatar)
    }
  }

  const generateCharacter = async (ref: any, service: string, fields?: GenField[]) => {
    const char = payload(ref)

    const prevAvatar = state.avatar
    const prevSprite = state.sprite

    if (fields?.length) {
      const result = await regenerateCharProp(char, service, fields)
      load(ref, result)
    } else {
      const result = await generateChar(char.description || 'a random character', service)
      load(ref, result)
    }
    setState('avatar', prevAvatar)
    setState('sprite', prevSprite)
  }

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
  }

  const clear = (ref: any) => {
    setImageData()
    load(ref, { ...initState, originalAvatar: undefined })
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

  return {
    state,
    update: setState,
    reset,
    load,
    convert,
    payload,
    original,
    clear,
    genOptions,
    createAvatar,
    avatar: imageData,
    canGuidance: genOptions().length > 0,
    generateCharacter,
    generateAvatar,
  }
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

async function generateAvatar(char: NewCharacter) {
  const { user } = userStore.getState()
  if (!user) {
    return toastStore.error(`Image generation settings missing`)
  }

  return new Promise<string>((resolve, reject) => {
    characterStore.generateAvatar(user, char.appearance || char.persona, (err, image) => {
      if (image) return resolve(image)
      reject(err)
    })
  })
}

function getModelForService(service: AIAdapter) {
  switch (service) {
    case 'openai':
      return OPENAI_MODELS.Turbo0301

    case 'novel':
      return NOVEL_MODELS.kayra_v1
  }
}
