import { createEffect, createMemo, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AppSchema, VoiceSettings } from '/common/types'
import { FullSprite } from '/common/types/sprite'
import { defaultCulture } from '/web/shared/CultureCodes'
import { ADAPTER_LABELS, PERSONA_FORMATS } from '/common/adapters'
import { getStrictForm, setFormField } from '/web/shared/util'
import { getAttributeMap } from '/web/shared/PersonaAttributes'
import {
  NewCharacter,
  characterStore,
  presetStore,
  settingStore,
  toastStore,
  userStore,
} from '/web/store'
import { getImageData } from '/web/store/data/chars'
import { Option } from '/web/shared/Select'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { GenField, generateChar, regenerateCharProp } from './generate-char'
import { BaseImageSettings, baseImageValid } from '/common/types/image-schema'

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
  insert?: {
    prompt: string
    depth: number
  }
  systemPrompt: string

  visualType: string
  avatar?: File
  sprite?: FullSprite

  tags: string[]
  book?: AppSchema.MemoryBook
  voiceDisabled?: boolean
  voice: VoiceSettings
  culture: string
  alternateGreetings: string[]
  persona: AppSchema.Persona

  imageSettings?: BaseImageSettings
}

const newCharGuard = {
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
  insertPrompt: 'string',
  insertDepth: 'number',
  creator: 'string',
  characterVersion: 'string',
  voiceDisabled: 'boolean?',
  ...baseImageValid,
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
  voiceDisabled: false,
  insert: {
    prompt: '',
    depth: 3,
  },
  systemPrompt: '',

  visualType: 'avatar',
  tags: [],
  alternateGreetings: [],
  culture: defaultCulture,
  voice: { service: undefined },
  sprite: undefined,
  book: undefined,
  persona: { kind: 'text', attributes: { text: [''] } },
  imageSettings: {
    type: 'sd',
    width: 512,
    height: 512,
    steps: 10,
    cfg: 9,
    negative: '',
    prefix: '',
    suffix: '',
    summariseChat: true,
    summaryPrompt: '',
    template: '',
  },
}

export type CharEditor = ReturnType<typeof useCharEditor>

export function useCharEditor(editing?: NewCharacter & { _id?: string }) {
  const user = userStore()
  const presets = presetStore()
  const settings = settingStore()
  const [original, setOriginal] = createSignal(editing)
  const [state, setState] = createStore<EditState>({ ...initState })
  const [imageData, setImageData] = createSignal<string>()
  const [form, setForm] = createSignal<any>()
  const [generating, setGenerating] = createSignal(false)

  const genOptions = createMemo(() => {
    if (!user.user) return []

    const preset = isDefaultPreset(user.user.defaultPreset)
      ? defaultPresets[user.user.defaultPreset]
      : presets.presets.find((p) => p._id === user.user?.defaultPreset)

    const opts: Option[] = []

    if (preset?.service && preset.service !== 'horde') {
      opts.push({ label: `Default (${ADAPTER_LABELS[preset.service!]})`, value: 'default' })
    }

    {
      const level = user.sub?.level ?? -1
      const subs = settings.config.subs.filter((s) => user.user?.admin || s.level <= level)

      for (const sub of subs) {
        opts.push({ label: `Agnastic: ${sub.name}`, value: `agnaistic/${sub._id}` })
      }
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

  const createAvatar = async () => {
    const char = payload()
    const avatar = await generateAvatar(char)

    if (avatar) {
      const base64 = await getImageData(avatar)
      setState('avatar', avatar)
      setImageData(base64)
    }
  }

  const generateCharacter = async (service: string, fields?: GenField[]) => {
    try {
      if (generating()) {
        toastStore.warn(`Cannot generate: Already generating`)
        return
      }

      setGenerating(true)
      if (state.personaKind === 'text') {
        setState('personaKind', 'attributes')
      }
      const char = payload()

      const prevAvatar = state.avatar
      const prevSprite = state.sprite

      if (fields?.length) {
        const result = await regenerateCharProp(char, service, state.personaKind, fields)
        load(result)
      } else {
        const result = await generateChar(
          char.name,
          char.description || 'a random character',
          service,
          state.personaKind
        )
        load(result)
      }
      setState('avatar', prevAvatar)
      setState('sprite', prevSprite)
    } finally {
      setGenerating(false)
    }
  }

  const reset = () => {
    const char = original()
    setState({ ...initState })

    const personaKind = char?.persona.kind || state.personaKind
    for (const [key, field] of fieldMap.entries()) {
      if (!char) setFormField(form(), field, '')
      else setFormField(form(), field, char[key] || '')
    }

    setState('personaKind', personaKind)
    setFormField(form(), 'kind', personaKind)

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
      insert: char?.insert?.prompt
        ? { prompt: char.insert.prompt, depth: char.insert.depth }
        : undefined,
    })
  }

  const clear = () => {
    setImageData()
    load({ ...initState, originalAvatar: undefined })
  }

  const load = (char: NewCharacter | AppSchema.Character) => {
    if ('_id' in char) {
      const { avatar, ...incoming } = char
      setOriginal({ ...incoming, originalAvatar: avatar })
      reset()
      return
    }

    setOriginal(char)
    reset()
  }

  const payload = () => {
    return getPayload(form(), state, original())
  }

  const convert = (): AppSchema.Character => {
    const payload = getPayload(form(), state, original())

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
    generating,
    canGuidance: genOptions().length > 0,
    generateCharacter,
    generateAvatar,
    prepare: setForm,
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
    voiceDisabled: body.voiceDisabled,
    voice: state.voice,

    // New fields start here
    systemPrompt: body.systemPrompt ?? '',
    postHistoryInstructions: body.postHistoryInstructions ?? '',
    insert: { prompt: body.insertPrompt, depth: body.insertDepth },
    alternateGreetings: state.alternateGreetings ?? [],
    characterBook: state.book,
    creator: body.creator ?? '',
    extensions: original?.extensions,
    characterVersion: body.characterVersion ?? '',
    persona: {
      kind: state.personaKind,
      attributes: persona.attributes,
    },
    imageSettings: {
      type: body.imageType,
      steps: body.imageSteps,
      width: body.imageWidth,
      height: body.imageHeight,
      prefix: body.imagePrefix,
      suffix: body.imageSuffix,
      negative: body.imageNegative,
      cfg: body.imageCfg,
      summariseChat: body.summariseChat,
      summaryPrompt: body.summaryPrompt,
    },
  }

  return payload
}

async function generateAvatar(char: NewCharacter) {
  const { user } = userStore.getState()
  if (!user) {
    return toastStore.error(`Image generation settings missing`)
  }

  return new Promise<File>((resolve, reject) => {
    characterStore.generateAvatar(user, char.appearance || char.persona, (err, image) => {
      if (image) return resolve(image)
      reject(err)
    })
  })
}
