import { createStore } from 'solid-js/store'
import { getImageSettings, IMG_PROVIDER_DEFAULTS, SD_SAMPLER, SWARM_SCHEDULER } from '/common/image'
import { characterStore, chatStore, imageStore, settingStore, userStore } from '/web/store'
import { createEffect, createMemo, on } from 'solid-js'
import { ImagePresetSettings, ImageProviderSettings } from '/common/types/image-schema'
import { isChatPageMemo } from '/web/shared/hooks'
import { useTabs } from '/web/shared/Tabs'
import { ImageModel } from '/common/types/admin'
import { AppSchema } from '/common/types'

type SettingSource = 'Shared' | 'Character' | 'Chat'

const PROVIDER_TYPES = [
  { label: 'Agnaistic', value: 'agnai' },
  { label: 'Horde', value: 'horde' },
  { label: 'NovelAI', value: 'novel' },
  { label: 'SD WebUI', value: 'sd' },
  { label: 'Swarm UI', value: 'swarm' },
  { label: 'OpenAI-Compat', value: 'openai' },
]

const init = (): ImagePresetSettings => ({
  _id: '',
  imageProviderId: '',
  summaryPresetId: '',
  cfg: 7,
  height: 1216,
  width: 768,
  steps: 28,
  clipSkip: 2,
  negative: '',
  suffix: '',
  summariseChat: true,
  summaryPrompt: '',
  autofix: true,
  name: '',
  prefix: '',
  sampler: SD_SAMPLER['Euler a'],
  scheduler: SWARM_SCHEDULER.Normal,
  seed: 0,
})

export type ImageContext = ReturnType<typeof useImageContext>[0]

export function useImageContext() {
  const isChat = isChatPageMemo(true)

  const page = imageStore((s) => ({ open: s.showImgSettings }))
  const user = userStore((s) => ({ user: s.user, sub: s.sub }))
  const settings = settingStore((s) => ({ config: s.config }))
  const entity = chatStore((s) => ({
    chat: s.details[s.lastChatId]?.chat,
    char: s.details[s.lastChatId]?.char,
  }))

  const [edit, setEdit] = createStore({
    preset: init(),
    provider: IMG_PROVIDER_DEFAULTS.horde,
  })

  const [current, setCurrent] = createStore({
    preset: init(),
    provider: IMG_PROVIDER_DEFAULTS.horde,
  })

  const editPreset = (update: Partial<ImagePresetSettings>) => {
    setEdit({ preset: { ...edit.preset, ...update } })
  }

  const editProvider = (update: Partial<ImageProviderSettings>) => {
    setEdit({ provider: { ...edit.provider, ...update } })
  }

  const [state, setState] = createStore({
    agnaiModel: undefined as ImageModel | undefined,
    canUseImages: false,
    hosts: [] as Array<{ label: string; value: string }>,
    source: 'settings' as AppSchema.ImageSettingsSource,
  })

  const [defaults, setDefaults] = createStore(
    user.user?.imageDefaults || {
      size: false,
      affixes: false,
      sampler: false,
      negative: false,
      guidance: false,
      steps: false,
    }
  )

  const tab = useTabs<SettingSource[]>(
    [],
    isChat() && entity.chat?.imageSource === 'chat'
      ? 1
      : entity.chat?.imageSource?.includes('character')
      ? 2
      : 0
  )

  createEffect(
    on(
      () => [entity.chat, entity.char],
      () => {
        const tabs: SettingSource[] = ['Shared']

        if (entity.chat && isChat()) tabs.push('Chat')
        if (entity.char && isChat()) tabs.push('Character')

        return tab.update(tabs)
      }
    )
  )

  createEffect(
    on(
      () => [isChat(), entity.chat?.imageSource],
      () => {
        const next = !isChat() ? 'settings' : entity.chat?.imageSource || 'settings'
        setState('source', next)
      }
    )
  )

  const toggleDefaults = (next: boolean) => {
    setDefaults({
      size: next,
      affixes: next,
      sampler: next,
      guidance: next,
      steps: next,
      negative: next,
    })
  }

  const hydrateConfig = (current?: boolean) => {
    // if (!page.open) return
    const currentTarget: SettingSource =
      isChat() && entity.chat?.imageSource === 'chat'
        ? 'Chat'
        : entity.chat?.imageSource?.includes('character')
        ? 'Character'
        : 'Shared'

    const settings = getImageSettings(entity.chat, entity.char, user.user!)

    const view = current ? currentTarget : tab.current()
    const setter = current ? setCurrent : setEdit

    switch (view) {
      case 'Character':
        setter({
          provider: { ...settings.provider },
          preset: {
            ...init(),
            ...settings.preset,
            imageProviderId:
              settings.preset?.imageProviderId ||
              entity.char.imageProviderId ||
              (entity.char.imageSettings as any)?.type,
          },
        })
        break

      case 'Chat':
        setter({
          provider: { ...settings.provider },
          preset: {
            ...init(),
            ...settings.preset,
            imageProviderId:
              settings.preset?.imageProviderId ||
              entity.chat.imageProviderId ||
              (entity.chat.imageSettings as any)?.type,
          },
        })
        break

      default:
        setter({
          provider: { ...settings.provider },
          preset: {
            ...init(),
            ...settings.preset,
            imageProviderId:
              settings.preset?.imageProviderId ||
              user.user?.imageProviderId ||
              (user.user?.images as any)?.type,
          },
        })
        break
    }

    if (!current) {
      hydrateConfig(true)
    }
  }

  createEffect(
    on(
      () => [
        page.open,
        user.sub,
        user.user,
        settings.config.serverConfig?.imagesModels,
        settings.config.serverConfig?.imagesEnabled,
      ],
      () => receiveUpdate()
    )
  )

  createEffect(
    on(
      () => [tab.current(), page.open],
      () => hydrateConfig()
    )
  )
  // onMount(hydrateConfig)

  createEffect(
    on(
      () => user.user?.imageDefaults,
      (next) => {
        if (!next) return
        setDefaults({ ...next })
      }
    )
  )

  createEffect(
    on(
      () => current.preset.imageProviderId,
      () => {
        if (!current.preset.imageProviderId) {
          setCurrent({ provider: IMG_PROVIDER_DEFAULTS.horde })
          return
        }

        const match = user.user?.imageProviders?.find(
          (s) => s._id === current.preset.imageProviderId
        )

        if (match && match._id !== current.provider?._id) {
          setCurrent({ provider: match })
          return
        }
      }
    )
  )

  createEffect(
    on(
      () => edit.preset.imageProviderId,
      () => {
        if (!edit.preset.imageProviderId) {
          setEdit({ provider: IMG_PROVIDER_DEFAULTS.horde })
          return
        }

        const match = user.user?.imageProviders?.find((s) => s._id === edit.preset.imageProviderId)

        if (match && match._id !== edit.provider?._id) {
          setEdit({ provider: match })
          return
        }
      }
    )
  )

  const receiveUpdate = () => {
    // if (!page.open) return

    const hostingImages =
      !!settings.config.serverConfig?.imagesEnabled &&
      settings.config.serverConfig?.imagesModels?.length > 0

    const hosts = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'SD WebUI', value: 'sd' },
      { label: 'Swarm UI', value: 'swarm' },
      { label: 'OpenAI-Compat', value: 'openai' },
    ]
      .map((item) => ({ label: `${item.label}`, value: item.value }))
      .filter((i) => i.value !== 'agnai')

    if (hostingImages) {
      hosts.unshift({ label: 'Agnaistic', value: 'agnai' })
    }

    setState({ canUseImages: hostingImages, hosts })
  }

  const save = () => {
    saveImageSettings(tab.current(), edit, entity)
  }

  const changeProvider = (providerId: string) => {
    editPreset({ imageProviderId: providerId })
    changeImageProvider(tab.current(), entity, providerId)
  }

  const tabSource = createMemo(() => {
    const current = tab.current()
    const source =
      current === 'Character' ? 'main-character' : current === 'Shared' ? 'settings' : 'chat'
    return { neat: current, source } as const
  })

  const changeChatSource = (chatId: string) => {
    if (!chatId) return
    const { source } = tabSource()
    chatStore.editChat(
      chatId,
      { imageSource: source },
      {
        onSuccess: () => {
          setState({ source })
        },
      }
    )
  }

  const editing = createMemo(() => {
    const source = tabSource()
    return source
  })

  return [
    {
      preset: edit.preset,
      provider: edit.provider,
      current: current.preset,
      updatePreset: editPreset,
      updateProvider: editProvider,
      state: state,
      defaults,
      toggleDefaults,
      updateDefaults: setDefaults,
      tab,
      save,
      changeProvider,
      changeChatSource,
      editingSource: editing,
    },
  ]
}

export function getImageProviderName(type: string) {
  const opt = PROVIDER_TYPES.find((t) => t.value === type)
  return opt?.label || 'None'
}

async function changeImageProvider(tab: string, entity: any, providerId: string) {
  switch (tab) {
    case 'Shared': {
      await userStore.updatePartialConfig({
        imageProviderId: providerId,
      })
      break
    }

    case 'Chat': {
      await Promise.all([
        chatStore.editChat(entity.chat?._id!, {
          imageProviderId: providerId,
        }),
      ])
      break
    }

    case 'Character': {
      await Promise.all([
        characterStore.editPartialCharacter(entity.char?._id!, {
          imageProviderId: providerId,
        }),
      ])
      break
    }

    default:
      break
  }

  // imageStore.imageSettings(false)
}

async function saveImageSettings(
  tab: string,
  store: { preset: ImagePresetSettings; provider: ImageProviderSettings },
  entity: any
) {
  const target = getImageTarget(tab, entity)
  await userStore.upsertImageSettings({ target, preset: store.preset, provider: store.provider })
  imageStore.imageSettings(false)
}

function getImageTarget(tab: string, entity: any) {
  switch (tab) {
    case 'Shared': {
      return { type: 'user', imagePresetId: '' }
    }

    case 'Character': {
      return { type: 'character', id: entity._id, imagePresetId: '' }
    }

    case 'Chat':
    default: {
      return { type: 'chat', id: entity._id, imagePresetId: '' }
    }
  }
}
