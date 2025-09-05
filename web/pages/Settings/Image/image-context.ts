import { createStore } from 'solid-js/store'
import { SD_SAMPLER } from '/common/image'
import { characterStore, chatStore, imageStore, settingStore, userStore } from '/web/store'
import { createEffect, on } from 'solid-js'
import { ImageDefaults, ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'
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

  const page = imageStore((s) => ({ open: s.showImgSettings }))
  const user = userStore((s) => ({ user: s.user, sub: s.sub }))
  const settings = settingStore((s) => ({ config: s.config }))
  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const [cfg, setCfg] = createStore(init())
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

  createEffect(
    on(
      () => [
        page.open,
        user.sub,
        user.user,
        settings.config.serverConfig?.imagesModels,
        settings.config.serverConfig?.imagesEnabled,
      ],
      () => recieveUpdate()
    )
  )

  createEffect(
    on(
      () => [tab.current(), page.open],
      () => {
        if (!page.open) return
        const view = tab.current()

        switch (view) {
          case 'Character':
            setCfg({ ...init(), ...entity.chat?.imageSettings })
            setState('editing', 'main-character')
            break

          case 'Chat':
            setCfg({ ...init(), ...entity.char?.imageSettings })
            setState('editing', 'chat')
            break

          default:
            setCfg({ ...init(), ...user.user?.images })
            setState('editing', 'settings')
            break
        }
      }
    )
  )

  createEffect(
    on(
      () => user.user?.imageDefaults,
      (next) => {
        if (!next) return
        setDefaults({ ...next })
      }
    )
  )

  const recieveUpdate = () => {
    if (!page.open) return

    const hostingImages =
      !!settings.config.serverConfig?.imagesEnabled &&
      settings.config.serverConfig?.imagesModels?.length > 0

    const hosts = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'Stable Diffusion', value: 'sd' },
    ].map((item) => ({ label: `Service: ${item.label}`, value: item.value }))

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
      await userStore.updatePartialConfig({ images: store, imageDefaults: defaults })
      imageStore.imageSettings(false)
      return
    }

    case 'Chat': {
      await Promise.all([
        chatStore.editChat(entity.chat?._id!, { imageSettings: store }),
        userStore.updatePartialConfig({ imageDefaults: defaults }),
      ])
      imageStore.imageSettings(false)
      return
    }

    case 'Character': {
      await Promise.all([
        characterStore.editPartialCharacter(entity.char?._id!, { imageSettings: store }),
        userStore.updatePartialConfig({ imageDefaults: defaults }),
      ])
      imageStore.imageSettings(false)
      return
    }

    default:
      return
  }
}
