import { Component, Match, Show, Switch, createEffect, createMemo, on, onMount } from 'solid-js'
import {
  NOVEL_IMAGE_MODEL,
  NOVEL_SAMPLER_REV,
  SD_SAMPLER,
  SD_SAMPLER_REV,
} from '../../../../common/image'
import Divider from '../../../shared/Divider'
import RangeInput from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { characterStore, chatStore, settingStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { SolidCard } from '/web/shared/Card'
import Tabs, { useTabs } from '/web/shared/Tabs'
import Button from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { RootModal } from '/web/shared/Modal'
import { ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'
import { SetStoreFunction, createStore } from 'solid-js/store'
import { applyStoreProperty } from '/web/shared/util'

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
  let formRef: any
  const state = userStore()
  const settings = settingStore()

  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const [store, setStore] = createStore(init)

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
    const access = state.sub?.tier.imagesAccess || state.user?.admin
    return (
      settings.config.serverConfig?.imagesEnabled &&
      access &&
      settings.config.serverConfig?.imagesModels?.length > 0
    )
  })

  const agnaiModel = createMemo(() => {
    if (!canUseImages()) return
    if (store.type !== 'agnai') return

    const id = state.user?.images?.agnai?.model
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

  const cfg = createMemo(() => {
    switch (tab.current()) {
      case 'App':
        return state.user?.images

      case 'Chat':
        return entity.chat?.imageSettings

      case 'Character':
        return entity.char?.imageSettings

      default:
        return state.user?.images
    }
  })

  const subclass = 'flex flex-col gap-4'

  const save = async () => {
    switch (tab.current()) {
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
          <Button onClick={save}>
            <Save /> Save
          </Button>
        </>
      }
    >
      <form ref={formRef} class="flex flex-col gap-4">
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
            Refer to the recommended settings at the bottom of the page when using Agnaistic image
            models
          </SolidCard>
        </Show>

        <RangeInput
          fieldName="imageSteps"
          min={5}
          max={128}
          step={1}
          value={store.steps ?? agnaiModel()?.init.steps ?? 50}
          label="Sampling Steps"
          helperText="(Novel Anlas Threshold: 28)"
          onChange={(ev) => setStore('steps', ev)}
        />

        <RangeInput
          fieldName="imageClipSkip"
          min={0}
          max={4}
          step={1}
          value={store.clipSkip ?? agnaiModel()?.init.clipSkip ?? 0}
          label="Clip Skip"
          helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
          onChange={(ev) => setStore('clipSkip', ev)}
        />

        <RangeInput
          fieldName="imageWidth"
          min={256}
          max={1280}
          step={128}
          value={store.width ?? agnaiModel()?.init.width ?? 1024}
          label="Image Width"
          helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
          onChange={(ev) => setStore('width', ev)}
        />

        <RangeInput
          fieldName="imageHeight"
          min={256}
          max={1280}
          step={128}
          value={store.height ?? agnaiModel()?.init.height ?? 1024}
          label="Image Height"
          helperText="The larger the image, the less that can be retain in your local cache. (Novel Anlas Threshold: 512)"
          onChange={(ev) => setStore('height', ev)}
        />

        <TextInput
          fieldName="imageCfg"
          value={store.cfg ?? agnaiModel()?.init.cfg ?? 9}
          label="CFG Scale"
          helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
          onChange={(ev) => setStore('cfg', +ev.currentTarget.value)}
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

const NovelSettings: Component<{ cfg: ImageSettings; setter: SetStoreFunction<ImageSettings> }> = (
  props
) => {
  const state = userStore()

  const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({ label: key, value }))
  const samplers = Object.entries(NOVEL_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">NovelAI</div>
      <Show when={!state.user?.novelVerified && !state.user?.novelApiKey}>
        <div class="font-bold text-red-600">
          You do not have a valid NovelAI key set. You will not be able to generate images using
          Novel.
        </div>
      </Show>
      <em>
        Note: The <b>Anlas Threshold</b> means anything above this value is cost Anlas credits
      </em>
      <Select
        fieldName="novelImageModel"
        items={models}
        label="Model"
        value={props.cfg?.novel?.model}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.model', ev.value))}
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg?.novel?.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.sampler', ev.value))}
      />
    </>
  )
}

const HordeSettings: Component<{ cfg: ImageSettings; setter: SetStoreFunction<ImageSettings> }> = (
  props
) => {
  const cfg = settingStore()

  const models = createMemo(() => {
    const map = new Map<string, number>()

    for (const worker of cfg.imageWorkers) {
      for (const model of worker.models) {
        if (!map.has(model)) {
          map.set(model, 0)
        }

        const current = map.get(model) ?? 0
        map.set(model, current + 1)
      }
    }

    const items = Array.from(map.entries())
      .sort(([, l], [, r]) => (l > r ? -1 : l === r ? 0 : 1))
      .map(([name, count]) => ({
        label: `${name} (${count})`,
        value: name,
      }))
    return items
  })

  createEffect(() => {
    settingStore.getHordeImageWorkers()
  })

  const samplers = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">Horde</div>
      <Select
        fieldName="hordeImageModel"
        items={models()}
        label="Model"
        value={props.cfg.horde?.model || 'stable_diffusion'}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'horde.model', ev.value))}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg.horde?.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'horde.sampler', ev.value))}
      />
    </>
  )
}

const SDSettings: Component<{ cfg: ImageSettings; setter: SetStoreFunction<ImageSettings> }> = (
  props
) => {
  const samplers = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">Stable Diffusion</div>
      <TextInput
        fieldName="sdUrl"
        label="Stable Diffusion WebUI URL"
        helperText="Base URL for Stable Diffusion. E.g. https://local-tunnel-url-10-20-30-40.loca.lt. If you are self-hosting, you can use http://localhost:7860"
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={props.cfg.sd?.url}
        onChange={(ev) =>
          props.setter(applyStoreProperty(props.cfg, 'sd.url', ev.currentTarget.value))
        }
      />
      <Select
        fieldName="sdSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg.sd?.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'sd.sampler', ev.value))}
      />
    </>
  )
}

const AgnaiSettings: Component<{ cfg: ImageSettings; setter: SetStoreFunction<ImageSettings> }> = (
  props
) => {
  const settings = settingStore((s) => {
    const models = s.config.serverConfig?.imagesModels || []
    return {
      models,
      names: models.map((m) => ({ label: m.desc.trim(), value: m.id || m.name })),
    }
  })

  const model = createMemo(() => {
    const original = props.cfg.agnai?.model
    const id =
      settings.models.length === 1
        ? settings.models[0].id || settings.models[0].name
        : props.cfg.agnai?.model || original
    const match = settings.models.find((m) => m.id === id || m.name === id)
    return match
  })

  const samplers = createMemo(() => {
    return Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
      label: value,
      value: key,
    }))
  })

  return (
    <>
      <div class="text-xl">Agnaistic</div>
      <Show when={settings.models.length === 0}>
        <i>No additional options available</i>
      </Show>
      <Select
        fieldName="agnaiModel"
        label="Agnaistic Image Model"
        items={settings.names}
        value={props.cfg.agnai?.model || settings.names[0]?.value}
        disabled={settings.models.length <= 1}
        classList={{ hidden: settings.models.length === 0 }}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.model', ev.value))}
      />

      <Select
        fieldName="agnaiSampler"
        items={samplers()}
        label={`Sampler`}
        value={props.cfg.agnai?.sampler}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.sampler', ev.value))}
      />

      <Show when={!!model()}>
        <div>
          <table class="table-auto border-separate border-spacing-2 ">
            <thead>
              <tr>
                <Th />
                <Th>Steps</Th>
                <Th>CFG</Th>
                <Th>Width</Th>
                <Th>Height</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Recommended</Td>
                <Td>{model()?.init.steps}</Td>
                <Td>{model()?.init.cfg}</Td>
                <Td>{model()?.init.width}</Td>
                <Td>{model()?.init.height}</Td>
              </tr>

              <tr>
                <Td>Maximums</Td>
                <Td>{model()?.limit.steps}</Td>
                <Td>{model()?.limit.cfg}</Td>
                <Td>{model()?.limit.width}</Td>
                <Td>{model()?.limit.height}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  )
}

const Th: Component<{ children?: any }> = (props) => (
  <th
    class="rounded-md border-[var(--bg-600)] p-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any }> = (props) => (
  <td class="rounded-md border-[var(--bg-600)] p-2 " classList={{ border: !!props.children }}>
    {props.children}
  </td>
)
