import { batch, createEffect, createMemo, createSignal, on } from 'solid-js'
import { SetStoreFunction, createStore } from 'solid-js/store'
import { AppSchema, VoiceSettings } from '/common/types'
import { FullSprite } from '/common/types/sprite'
import { defaultCulture } from '/web/shared/CultureCodes'
import { ADAPTER_LABELS } from '/common/adapters'
import { fromAttrs, toAttrs } from '/web/shared/PersonaAttributes'
import {
  NewCharacter,
  characterStore,
  presetStore,
  settingStore,
  toastStore,
  userStore,
} from '/web/store'
import { Option } from '/web/shared/Select'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { generateField } from './generate-char'
import { ImageSettings } from '/common/types/image-schema'
import { useImageCache } from '/web/shared/hooks'
import { imageApi } from '/web/store/data/image'
import { v4 } from 'uuid'
import { ResponseSchema } from '/common/types/library'

export type EditorState = {
  editId?: string
  name: string
  personaKind: AppSchema.Character['persona']['kind']
  personaAttrs: Array<{ key: string; values: string }>
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
  originalAvatar?: any
  sprite?: FullSprite

  tags: string[]
  book?: AppSchema.MemoryBook
  voiceDisabled?: boolean
  voice: VoiceSettings
  culture: string
  alternateGreetings: string[]
  persona: AppSchema.Persona

  imageSettings?: ImageSettings
  json?: ResponseSchema
  imageOverride: string
}

export type SetEditor = SetStoreFunction<EditorState>

const initState: EditorState = {
  name: '',
  personaKind: 'text',
  personaAttrs: [],
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
    clipSkip: 0,
    cfg: 9,
    negative: '',
    prefix: '',
    suffix: '',
    summariseChat: true,
    summaryPrompt: '',
    template: '',

    agnai: {
      model: '',
      sampler: '',
      draftMode: false,
    },

    horde: {
      model: '',
      sampler: '',
    },

    novel: {
      model: '',
      sampler: '',
    },

    sd: {
      sampler: '',
      url: '',
    },
  },
  imageOverride: '',
}

export type CharEditor = ReturnType<typeof useCharEditor>

export function useCharEditor(editing?: NewCharacter & { _id?: string }) {
  const user = userStore()
  const presets = presetStore()
  const settings = settingStore()

  const cache = useImageCache('avatars', { clean: true })

  const [original, setOriginal] = createSignal(editing)
  const [state, setState] = createStore<EditorState>({ ...initState })
  const [imageData, setImageData] = createSignal<string>()
  const [form, setForm] = createSignal<any>()
  const [generating, setGenerating] = createSignal(false)
  const [imageId, setImageId] = createSignal('')

  const canGenerate = createMemo(
    on(
      () => `${state.name}${state.description}`,
      () => {
        return !!state.name.trim() && !!state.description.trim()
      }
    )
  )

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
      const subs = settings.config.subs.filter((s) => user.user?.admin || s.level <= user.userLevel)

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
    const nextImage = cache.state.image

    if (nextImage) {
      const file = await imageApi.dataURLtoFile(nextImage, cache.state.imageId)

      setImageData(nextImage)
      setState('avatar', file)
    }
  })

  createEffect(() => {
    if (!editing) return

    const orig = original()
    if (!orig || orig._id !== editing._id) {
      setOriginal(editing)
    }
  })

  const receiveAvatar = async (image: File, original?: boolean) => {
    if (!image) return
    const base64 = await imageApi.getImageData(image)
    setState('avatar', image)
    setImageData(base64)

    if (base64) {
      const id = original ? 'original' : v4()
      await cache.addImage(base64, id)
      if (original) {
        setImageId(`avatars-${id}`)
      }
    }

    return base64
  }

  const createAvatar = async () => {
    const current = payload()
    const attributes = fromAttrs(state.personaAttrs)
    const desc = current.appearance || (attributes?.appeareance || attributes?.looks)?.join(', ')
    const override = state.imageOverride
    const avatar = await generateAvatar(desc || '', override)
    if (!avatar) return

    return receiveAvatar(avatar)
  }

  const genField = async (field: string, trait?: string) => {
    const char = payload(false)

    if (generating()) {
      toastStore.warn(`Cannot generate: Already generating`)
      return
    }

    setGenerating(true)

    const index = trait
      ? state.personaAttrs.findIndex((a) => a.key === trait)
      : state.personaAttrs.findIndex((a) => a.key === 'text')

    generateField({
      char,
      prop: field,
      trait,
      tick: (res, st) => {
        if (st === 'done' || st === 'error') {
          setGenerating(false)
        }

        if (st !== 'done' && st !== 'partial') return

        if (field === 'persona') {
          const next = [...state.personaAttrs]
          next[index] = { key: trait || 'text', values: res }
          setState('personaAttrs', next)
          // const attributes = { ...char.persona.attributes }
          // if (!trait) {
          //   attributes.text = [res]
          // } else {
          //   attributes[trait as 'text'] = [res]
          // }

          // setState('personaAttrs', attributes)
          return
        }

        if (field in state) {
          setState(field as keyof EditorState, res)
        }
      },
    })
  }

  const reset = async () => {
    batch(async () => {
      const char = original()
      setState({ ...initState })

      const personaKind = char?.persona.kind || state.personaKind

      setState('personaKind', personaKind)

      if (char?.originalAvatar) {
        // Intentionally do this in a separate tick
        // It's not worth holding up the editor for this
        Promise.resolve().then(async () => {
          try {
            const base64 = await imageApi.getImageData(char.originalAvatar)
            if (base64) {
              const file = await imageApi.dataURLtoFile(base64)
              receiveAvatar(file, true)
            }
          } catch (ex) {}
        })
      }

      // We set fields that aren't properly managed by form elements
      setState({
        ...char,
        personaKind,
        personaAttrs: toAttrs(char?.persona.attributes),
        alternateGreetings: char?.alternateGreetings || [],
        book: char?.characterBook,
        voice: char?.voice || { service: undefined },
        sprite: char?.sprite || undefined,
        visualType: char?.visualType || 'avatar',
        culture: char?.culture || defaultCulture,
        insert: char?.insert ? { prompt: char.insert.prompt, depth: char.insert.depth } : undefined,
      })
    })
  }

  const clear = () => {
    setImageData()
    load({ ...initState, originalAvatar: undefined })
  }

  const load = (char: NewCharacter | AppSchema.Character) => {
    batch(() => {
      if ('_id' in char) {
        const { avatar, ...incoming } = char
        setOriginal({ ...incoming, originalAvatar: avatar })
        reset()
        return
      }

      setOriginal(char)
      reset()
    })
  }

  const payload = (submitting?: boolean) => {
    const imgId = imageId()
    const data = getPayload(form(), state, original())

    if (submitting) {
      if (imgId !== cache.state.imageId) {
        data.avatar = state.avatar
        setImageId(cache.state.imageId)
      } else {
        delete data.avatar
      }
    }

    return data
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
    receiveAvatar,
    avatar: imageData,
    generating,
    canGenerate,
    canGuidance: genOptions().length > 0,
    generateField: genField,
    generateAvatar,
    prepare: setForm,
    imageCache: cache,
  }
}

function getPayload(ev: any, state: EditorState, original?: NewCharacter) {
  const payload = {
    name: state.name,
    description: state.description,
    culture: state.culture,
    tags: state.tags,
    scenario: state.scenario,
    appearance: state.appearance,
    visualType: state.visualType,
    avatar: state.avatar ?? (null as any),
    sprite: state.sprite ?? (null as any),
    greeting: state.greeting,
    sampleChat: state.sampleChat,
    originalAvatar: original?.originalAvatar,
    voiceDisabled: state.voiceDisabled,
    voice: state.voice,

    // New fields start here
    systemPrompt: state.systemPrompt ?? '',
    postHistoryInstructions: state.postHistoryInstructions ?? '',
    insert: { prompt: state.insert?.prompt || '', depth: state.insert?.depth ?? 3 },
    alternateGreetings: state.alternateGreetings ?? [],
    characterBook: state.book,
    creator: state.creator ?? '',
    extensions: original?.extensions,
    characterVersion: state.characterVersion ?? '',
    persona: {
      kind: state.personaKind,
      attributes: fromAttrs(state.personaAttrs),
    },
    json: {
      ...state.json,
    } as ResponseSchema,
  }

  return payload
}

async function generateAvatar(description: string, override?: string) {
  const { user } = userStore.getState()
  if (!user) {
    return toastStore.error(`Image generation settings missing`)
  }

  // const image = await imageApi.generateImageAsync(description)
  // return image

  return new Promise<File>((resolve, reject) => {
    characterStore.generateAvatar({ user, persona: description, override }, (err, image) => {
      if (err) return reject(err)
      if (image) return resolve(image)
      reject(err)
    })
  })
}
