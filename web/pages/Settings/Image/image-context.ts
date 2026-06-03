import { createStore } from 'solid-js/store'
import { SD_SAMPLER } from '/common/image'
import { characterStore, chatStore, imageStore, settingStore, userStore } from '/web/store'
import { createEffect, on } from 'solid-js'
import { ImageDefaults, ImageSettings } from '/common/types/image-schema'
import { isChatPageMemo } from '/web/shared/hooks'
import { useTabs } from '/web/shared/Tabs'
import { ImageModel } from '/common/types/admin'
import { AppSchema } from '/common/types'

type SettingSource = 'Shared' | 'Character' | 'Chat'

const init = (): ImageSettings => ({
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
  template: '',
  type: 'horde',
  imageProviderId: '',
  openai: {} as any,
  agnai: {
    _id: 'agnai',
    type: 'agnai',
    name: 'Agnaistic',
    url: '',
    model: '',
    sampler: SD_SAMPLER['Euler a'],
    draftMode: false,
  },
  horde: {
    _id: 'horde',
    type: 'horde',
    name: 'Horde',
    url: '',
    sampler: SD_SAMPLER['Euler a'],
    model: '',
  },
  sd: {
    _id: 'sd',
    type: 'sd',
    name: 'Stable Diffusion',
    model: '',
    url: '',
    sampler: SD_SAMPLER['Euler a'],
  },
  novel: {
    _id: 'novel',
    type: 'novel',
    name: 'NovelAI',
    url: '',
    model: '',
    sampler: SD_SAMPLER['Euler a'],
    ucPreset: '0',
    qualityTags: true,
  },
  swarm: {
    _id: 'swarm',
    type: 'swarm',
    name: 'SwarmUI',
    model: '',
    sampler: SD_SAMPLER['Euler a'],
    url: 'http://localhost:7801',
    local: true,
  },
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

  const [cfg, setCfg] = createStore(init())
  const [currentCfg, setCurrentCfg] = createStore(init())

  const [state, setState] = createStore({
    agnaiModel: undefined as ImageModel | undefined,
    canUseImages: false,
    hosts: [] as Array<{ label: string; value: string }>,
    source: 'settings' as AppSchema.ImageSettingsSource,
    editing: 'settings' as 'main-character' | 'settings' | 'chat',
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

    if (current) {
      console.log('CURRENT!', currentTarget)
    }
    const view = current ? currentTarget : tab.current()
    const setter = current ? setCurrentCfg : setCfg

    switch (view) {
      case 'Character':
        setter({
          ...init(),
          ...entity.chat?.imageSettings,
          imageProviderId: entity.char.imageProviderId || entity.char.imageSettings?.type,
        })
        setState('editing', 'main-character')
        break

      case 'Chat':
        setter({
          ...init(),
          ...entity.char?.imageSettings,
          imageProviderId: entity.chat.imageProviderId || entity.chat.imageSettings?.type,
        })
        setState('editing', 'chat')
        break

      default:
        setter({
          ...init(),
          ...user.user?.images,
          imageProviderId: user.user?.imageProviderId || user.user?.images?.type,
        })
        setState('editing', 'settings')
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

  const receiveUpdate = () => {
    if (!page.open) return

    const hostingImages =
      !!settings.config.serverConfig?.imagesEnabled &&
      settings.config.serverConfig?.imagesModels?.length > 0

    const hosts = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'Stable Diffusion', value: 'sd' },
      { label: 'Swarm UI', value: 'swarm' },
      { label: 'OpenAI Compatible', value: 'openai' },
    ].map((item) => ({ label: `${item.label}`, value: item.value }))

    if (hostingImages) {
      hosts.unshift({ label: 'Agnaistic', value: 'agnai' })
    }

    setState({ canUseImages: hostingImages, hosts })
  }

  const save = () => {
    saveImageSettings(tab.current(), cfg, entity, defaults)
  }

  return [
    {
      store: cfg,
      current: currentCfg,
      update: setCfg,
      state: state,
      defaults,
      toggleDefaults,
      updateDefaults: setDefaults,
      tab,
      save,
    },
  ]
}

async function saveImageSettings(
  tab: string,
  store: ImageSettings,
  entity: any,
  defaults: ImageDefaults
) {
  switch (tab) {
    case 'Shared': {
      await userStore.updatePartialConfig({
        images: store,
        imageDefaults: defaults,
        imageProviderId: store.imageProviderId,
      })
      imageStore.imageSettings(false)
      return
    }

    case 'Chat': {
      await Promise.all([
        chatStore.editChat(entity.chat?._id!, {
          imageSettings: store,
          imageProviderId: store.imageProviderId,
        }),
        userStore.updatePartialConfig({ imageDefaults: defaults }),
      ])
      imageStore.imageSettings(false)
      return
    }

    case 'Character': {
      await Promise.all([
        characterStore.editPartialCharacter(entity.char?._id!, {
          imageSettings: store,
          imageProviderId: store.imageProviderId,
        }),
        userStore.updatePartialConfig({ imageDefaults: defaults }),
      ])
      imageStore.imageSettings(false)
      return
    }

    default:
      return
  }
}
