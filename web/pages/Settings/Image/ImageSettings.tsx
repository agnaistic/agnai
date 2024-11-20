import { Match, Show, Switch, createEffect, createMemo, on, onMount } from 'solid-js'
import { SD_SAMPLER } from '../../../../common/image'
import Divider from '../../../shared/Divider'
import RangeInput from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { characterStore, chatStore, settingStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { SolidCard } from '/web/shared/Card'
import Tabs, { useTabs } from '/web/shared/Tabs'
import Button, { ToggleButton } from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { RootModal } from '/web/shared/Modal'
import { ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'
import { createStore } from 'solid-js/store'
import { AgnaiSettings, HordeSettings, NovelSettings, SDSettings } from './ServiceSettings'
import { FormLabel } from '/web/shared/FormLabel'

const init: ImageSettings = {
  cfg: 7,
  height: 1216,
  width: 768,
  steps: 28,
  clipSkip: 2,
  negative: '',
  prefix: '',
  suffix: 'full body shot, studio lighting',
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
  },
}

export const ImageSettingsModal = () => {
  const user = userStore()
  const settings = settingStore()

  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const [store, setStore] = createStore(init)
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

  const toggleDefaults = (next: boolean) =>
    setDefaults({
      size: next,
      affixes: next,
      sampler: next,
      guidance: next,
      steps: next,
      negative: next,
    })

  const isAllEnabled = createMemo(() => Array.from(Object.values(defaults)).every((v) => !!v))

  const isChat = isChatPage(true)

  onMount(() => settingStore.getServerConfig())

  const tabs = createMemo(() => {
    const tabs = ['App']
    if (isChat()) {
      if (entity.chat) tabs.push('Chat')
      if (entity.char) tabs.push('Character')
    }
    return tabs
  })

  const tab = useTabs(
    tabs(),
    isChat() && entity.chat?.imageSource === 'chat'
      ? 1
      : entity.chat?.imageSource?.includes('character')
      ? 2
      : 0
  )

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

  const imageTypes = createMemo(() => {
    const list = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'Stable Diffusion', value: 'sd' },
    ]

    if (canUseImages()) {
      list.push({ label: 'Agnaistic', value: 'agnai' })
    }

    return list
  })

  createEffect(
    on(
      () => cfg(),
      (cfg) => {
        if (!cfg) return
        setStore({ ...init, ...cfg })
      }
    )
  )

  createEffect(
    on(
      () => user.user?.imageDefaults,
      (next) => {
        if (!next) return
        setDefaults(next)
      }
    )
  )

  createEffect(() => {
    userStore.updatePartialConfig({ imageDefaults: defaults }, true)
  })

  const cfg = createMemo(() => {
    switch (tab.current()) {
      case 'App':
        return user.user?.images

      case 'Chat':
        return entity.chat?.imageSettings

      case 'Character':
        return entity.char?.imageSettings

      default:
        return user.user?.images
    }
  })

  const subclass = 'flex flex-col gap-4'

  return (
    <RootModal
      maxWidth="half"
      show={settings.showImgSettings}
      close={() => settingStore.imageSettings(false)}
      footer={
        <>
          <Button onClick={() => settingStore.imageSettings(false)}>
            <X /> Close
          </Button>
          <Button onClick={() => save(tab.current(), store, entity)}>
            <Save /> Save
          </Button>
        </>
      }
    >
      <form class="flex flex-col gap-4">
        <Switch>
          <Match when={tab.current() === 'App'}>
            <SolidCard type="hl">
              <div>App Settings</div>
              <Show when={!isChat()}>
                <div class="text-500 text-sm italic">
                  Note: <b>Chat</b> and <b>Character</b> image settings are only available when a
                  chat is open.
                </div>
              </Show>
            </SolidCard>
          </Match>
          <Match when={tab.current() === 'Character'}>
            <SolidCard type="hl">
              <div>Character Settings</div>
              <div class="text-500 text-sm italic">Editing: {entity.char?.name}</div>
            </SolidCard>
          </Match>
          <Match when={tab.current() === 'Chat'}>
            <SolidCard type="hl">
              <div>Current Chat Settings</div>
              <div class="text-500 text-sm italic">Chatting with: {entity.char?.name}</div>
            </SolidCard>
          </Match>
        </Switch>

        <Tabs tabs={tab.tabs} select={tab.select} selected={tab.selected} />

        <Show when={canUseImages() && store.type === 'agnai'}>
          <FormLabel
            label="Use Recommended Settings"
            helperText="When available use the image model's recommended settings."
          />
          <div class="flex flex-wrap justify-center gap-2">
            <ToggleButton size="sm" value={isAllEnabled()} onChange={(ev) => toggleDefaults(ev)}>
              Toggle All
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.affixes}
              onChange={(ev) => setDefaults('affixes', ev)}
            >
              Affixes
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.size}
              onChange={(ev) => setDefaults('size', ev)}
            >
              Size
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.guidance}
              onChange={(ev) => setDefaults('guidance', ev)}
            >
              Guidance
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.steps}
              onChange={(ev) => setDefaults('steps', ev)}
            >
              Steps
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.negative}
              onChange={(ev) => setDefaults('negative', ev)}
            >
              Negative Prompt
            </ToggleButton>
            <ToggleButton
              size="sm"
              value={defaults.sampler}
              onChange={(ev) => setDefaults('sampler', ev)}
            >
              Sampler
            </ToggleButton>
          </div>
        </Show>

        <div class={store.type === 'novel' ? subclass : 'hidden'}>
          <NovelSettings cfg={store} setter={setStore} />
        </div>

        <div class={store.type === 'horde' ? subclass : 'hidden'}>
          <HordeSettings cfg={store} setter={setStore} />
        </div>

        <div class={tab.current() === 'App' && store.type === 'sd' ? subclass : 'hidden'}>
          <SDSettings cfg={store} setter={setStore} />
        </div>

        <div class={store.type === 'agnai' ? subclass : 'hidden'}>
          <AgnaiSettings cfg={store} setter={setStore} />
        </div>

        <Divider />

        <Select
          fieldName="imageType"
          items={imageTypes()}
          value={store.type ?? 'horde'}
          onChange={(value) => setStore('type', value.value as any)}
        />

        <Show when={store.type === 'agnai'}>
          <SolidCard bg="rose-600">
            Refer to the recommended settings when using Agnaistic image models
          </SolidCard>
        </Show>

        <RangeInput
          fieldName="imageSteps"
          min={5}
          max={128}
          step={1}
          value={store.steps ?? agnaiModel()?.init.steps ?? 50}
          label="Sampling Steps"
          onChange={(ev) => setStore('steps', ev)}
        />

        <RangeInput
          fieldName="imageClipSkip"
          min={0}
          max={4}
          step={1}
          value={store.clipSkip ?? agnaiModel()?.init.clipSkip ?? 0}
          label="Clip Skip"
          helperText="The larger the image, the less that can be retained in your local cache."
          onChange={(ev) => setStore('clipSkip', ev)}
        />

        <RangeInput
          fieldName="imageWidth"
          min={256}
          max={1280}
          step={128}
          value={store.width ?? agnaiModel()?.init.width ?? 1024}
          label="Image Width"
          helperText="The larger the image, the less that can be retained in your local cache."
          onChange={(ev) => setStore('width', ev)}
        />

        <RangeInput
          fieldName="imageHeight"
          min={256}
          max={1280}
          step={128}
          value={store.height ?? agnaiModel()?.init.height ?? 1024}
          label="Image Height"
          helperText="The larger the image, the less that can be retain in your local cache."
          onChange={(ev) => setStore('height', ev)}
        />

        <TextInput
          fieldName="imageCfg"
          value={store.cfg ?? agnaiModel()?.init.cfg ?? 9}
          label="Guidance Scale"
          helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
          onChange={(ev) => setStore('cfg', +ev.currentTarget.value)}
        />

        <TextInput
          fieldName="seed"
          value={store.seed ?? 0}
          label="Seed"
          type="number"
          helperText="Seed number (0 = random). Note: The seed will not be consistent across different servers."
          onChange={(ev) =>
            setStore(
              'seed',
              Math.max(0, Math.min(+ev.currentTarget.value, Number.MAX_SAFE_INTEGER))
            )
          }
        />

        <TextInput
          fieldName="imagePrefix"
          value={store.prefix}
          label="Prompt Prefix"
          helperText="(Optional) Text to prepend to your image prompt"
          placeholder={`E.g.: best quality, masterpiece`}
          onChange={(ev) => setStore('prefix', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="imageSuffix"
          value={store.suffix}
          label="Prompt Suffix"
          helperText="(Optional) Text to append to your image prompt"
          placeholder={`E.g.: full body, visible legs, dramatic lighting`}
          onChange={(ev) => setStore('suffix', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="imageNegative"
          label="Negative Prompt"
          helperText="(Optional) Negative Prompt"
          placeholder={`E.g.: painting, drawing, illustration, glitch, deformed, mutated, cross-eyed, disfigured`}
          value={store.negative}
          onChange={(ev) => setStore('negative', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="summaryPrompt"
          label="Summary Prompt"
          helperText='When summarising the chat to an image caption, this is the "prompt" sent to OpenAI to summarise your conversation into an image prompt.'
          placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
          value={store.summaryPrompt}
          onChange={(ev) => setStore('summaryPrompt', ev.currentTarget.value)}
        />

        <Toggle
          fieldName="summariseChat"
          label="Summarise Chat"
          helperText="When available use your AI service to summarise the chat into an image prompt. Only available with services with Instruct capabilities (Agnai, NovelAI, OpenAI, Claude, etc)"
          value={store.summariseChat}
          onChange={(ev) => setStore('summariseChat', ev)}
        />
      </form>
    </RootModal>
  )
}

async function save(tab: string, store: ImageSettings, entity: any) {
  switch (tab) {
    case 'App': {
      await userStore.updatePartialConfig({ images: store })
      return
    }

    case 'Chat': {
      chatStore.editChat(entity.chat?._id!, { imageSettings: store }, undefined)
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
