import { createStore } from 'solid-js/store'
import { SD_SAMPLER } from '/common/image'
import { characterStore, chatStore, settingStore, userStore } from '/web/store'
import { createEffect, createMemo } from 'solid-js'
import { ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'
import { useTabs } from '/web/shared/Tabs'

type SettingSource = 'Shared' | 'Character' | 'Chat'

const init = (): ImageSettings => ({
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
  agnai: {
    model: '',
    sampler: SD_SAMPLER['Euler a'],
    draftMode: false,
  },
  horde: {
    sampler: SD_SAMPLER['Euler a'],
    model: '',
  },
  sd: {
    sampler: SD_SAMPLER['Euler a'],
    url: '',
  },
  novel: {
    model: '',
    sampler: SD_SAMPLER['Euler a'],
    ucPreset: '0',
    qualityTags: true,
  },
})

export type ImageContext = ReturnType<typeof useImageContext>[0]

export function useImageContext() {
  const isChat = isChatPage(true)

  const user = userStore()
  const settings = settingStore()
  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const [store, setStore] = createStore(init())

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

  createEffect(() => {
    const tabs: SettingSource[] = ['Shared']

    if (entity.chat && isChat()) tabs.push('Chat')
    if (entity.char && isChat()) tabs.push('Character')

    return tab.update(tabs)
  })

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

  const currentSource = createMemo(() => {
    if (!isChat()) return 'settings'
    return entity.chat?.imageSource || 'settings'
  })

  const currentEditing = createMemo(() => {
    switch (tab.current()) {
      case 'Shared':
        return 'settings'

      case 'Chat':
        return 'chat'

      case 'Character':
      default:
        return 'main-character'
    }
  })

  const canUseImages = createMemo(() => {
    const access = user.sub?.tier.imagesAccess || user.user?.admin
    return (
      settings.config.serverConfig?.imagesEnabled &&
      access &&
      settings.config.serverConfig?.imagesModels?.length > 0
    )
  })

  const agnaiModel = createMemo(() => {
    if (!canUseImages()) return
    if (store.type !== 'agnai') return

    const id = user.user?.images?.agnai?.model
    return settings.config.serverConfig?.imagesModels?.find((m) => m.name === id)
  })

  const hosts = createMemo(() => {
    const list = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'Stable Diffusion', value: 'sd' },
    ].map((item) => ({ label: `Service: ${item.label}`, value: item.value }))

    if (canUseImages()) {
      list.push({ label: 'Agnaistic', value: 'agnai' })
    }

    return list
  })

  const cfg = createMemo(() => {
    switch (tab.current()) {
      case 'Shared':
        return user.user?.images

      case 'Chat':
        return entity.chat?.imageSettings

      case 'Character':
        return entity.char?.imageSettings

      default:
        return user.user?.images
    }
  })

  const save = () => {
    saveImageSettings(tab.current(), store, entity)
  }

  return [
    {
      hosts,

      store,
      update: setStore,
      defaults,
      toggleDefaults,
      updateDefaults: setDefaults,
      agnaiModel,
      tab,
      cfg,
      currentSource,
      currentEditing,
      save,
    },
  ]
}

async function saveImageSettings(tab: string, store: ImageSettings, entity: any) {
  switch (tab) {
    case 'Shared': {
      await userStore.updatePartialConfig({ images: store })
      settingStore.imageSettings(false)
      return
    }

    case 'Chat': {
      chatStore.editChat(entity.chat?._id!, { imageSettings: store })
      return
    }

    case 'Character': {
      characterStore.editPartialCharacter(entity.char?._id!, { imageSettings: store })
      return
    }

    default:
      return
  }
}
