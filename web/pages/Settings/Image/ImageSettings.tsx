import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from 'solid-js'
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
import { getStrictForm } from '/web/shared/util'
import Button from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { RootModal } from '/web/shared/Modal'
import { ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'

const imageForm = {
  imageType: ['horde', 'sd', 'novel', 'agnai'],
  imageSteps: 'number',
  imageClipSkip: 'number',
  imageCfg: 'number',
  imageWidth: 'number',
  imageHeight: 'number',
  imagePrefix: 'string?',
  imageSuffix: 'string?',
  imageNegative: 'string?',
  summariseChat: 'boolean?',
  summaryPrompt: 'string?',

  novelImageModel: 'string',
  novelSampler: 'string',

  hordeSampler: 'string',
  hordeImageModel: 'string?',

  sdUrl: 'string',
  sdSampler: 'string',

  agnaiModel: 'string?',
  agnaiSampler: 'string?',
} as const

export const ImageSettingsModal = () => {
  let formRef: any
  const state = userStore()
  const settings = settingStore()

  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const isChat = isChatPage(true)
  const [type, setType] = createSignal(state.user?.images?.type || 'horde')

  onMount(() => {
    settingStore.getServerConfig()
  })

  const tabs = createMemo(() => {
    const tabs = ['App']

    if (isChat()) {
      if (entity.chat) {
        tabs.push('Chat')
      }

      if (entity.char) {
        tabs.push('Character')
      }
    }

    return tabs
  })

  const tab = useTabs(
    tabs(),
    isChat()
      ? entity.chat?.imageSource === 'chat'
        ? 1 //
        : !entity.chat?.imageSource || entity.chat?.imageSource === 'settings'
        ? 0
        : 2
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
    if (type() !== 'agnai') return

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
        setType(cfg.type)
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
    const body = getStrictForm(formRef, imageForm)
    const providers = {
      horde: {
        sampler: body.hordeSampler,
        model: body.hordeImageModel || '',
      },
      novel: {
        model: body.novelImageModel,
        sampler: body.novelSampler,
      },
      sd: {
        sampler: body.sdSampler,
        url: body.sdUrl,
      },
      agnai: { model: body.agnaiModel || '', sampler: body.agnaiSampler || '' },
    }
    const payload = {
      type: body.imageType,
      cfg: body.imageCfg,
      clipSkip: body.imageClipSkip,
      height: body.imageHeight,
      width: body.imageWidth,
      steps: body.imageSteps,
      negative: body.imageNegative,
      prefix: body.imagePrefix,
      suffix: body.imageSuffix,
      summariseChat: body.summariseChat,
      summaryPrompt: body.summaryPrompt,
      ...providers,
    }

    switch (tab.current()) {
      case 'App': {
        await userStore.updatePartialConfig({ images: { ...payload, ...providers } })
        return
      }

      case 'Chat': {
        chatStore.editChat(entity.chat?._id!, { imageSettings: payload }, undefined)
        return
      }

      case 'Character': {
        characterStore.editPartialCharacter(entity.char?._id!, { imageSettings: payload })
        return
      }

      default:
        return state.user?.images
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

        <div class={type() === 'novel' ? subclass : 'hidden'}>
          <NovelSettings cfg={cfg() as ImageSettings} />
        </div>

        <div class={type() === 'horde' ? subclass : 'hidden'}>
          <HordeSettings cfg={cfg() as ImageSettings} />
        </div>

        <div class={tab.current() === 'App' && type() === 'sd' ? subclass : 'hidden'}>
          <SDSettings cfg={cfg() as ImageSettings} />
        </div>

        <div class={type() === 'agnai' ? subclass : 'hidden'}>
          <AgnaiSettings cfg={cfg() as ImageSettings} />
        </div>

        <Divider />

        <Select
          fieldName="imageType"
          items={imageTypes()}
          value={cfg()?.type ?? 'horde'}
          onChange={(value) => setType(value.value as any)}
        />

        <Show when={type() === 'agnai'}>
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
          value={cfg()?.steps ?? agnaiModel()?.init.steps ?? 50}
          label="Sampling Steps"
          helperText="(Novel Anlas Threshold: 28)"
        />

        <RangeInput
          fieldName="imageClipSkip"
          min={0}
          max={4}
          step={1}
          value={cfg()?.clipSkip ?? agnaiModel()?.init.clipSkip ?? 0}
          label="Clip Skip"
          helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
        />

        <RangeInput
          fieldName="imageWidth"
          min={256}
          max={1280}
          step={128}
          value={cfg()?.width ?? agnaiModel()?.init.width ?? 1024}
          label="Image Width"
          helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
        />

        <RangeInput
          fieldName="imageHeight"
          min={256}
          max={1280}
          step={128}
          value={cfg()?.height ?? agnaiModel()?.init.height ?? 1024}
          label="Image Height"
          helperText="The larger the image, the less that can be retain in your local cache. (Novel Anlas Threshold: 512)"
        />

        <TextInput
          fieldName="imageCfg"
          value={cfg()?.cfg ?? agnaiModel()?.init.cfg ?? 9}
          label="CFG Scale"
          helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
        />

        <TextInput
          fieldName="imagePrefix"
          value={cfg()?.prefix}
          label="Prompt Prefix"
          helperText="(Optional) Text to prepend to your image prompt"
          placeholder={`E.g.: best quality, masterpiece`}
        />

        <TextInput
          fieldName="imageSuffix"
          value={cfg()?.suffix}
          label="Prompt Suffix"
          helperText="(Optional) Text to append to your image prompt"
          placeholder={`E.g.: full body, visible legs, dramatic lighting`}
        />

        <TextInput
          fieldName="imageNegative"
          value={cfg()?.negative}
          label="Negative Prompt"
          helperText="(Optional) Negative Prompt"
          placeholder={`E.g.: painting, drawing, illustration, glitch, deformed, mutated, cross-eyed, disfigured`}
        />

        <TextInput
          fieldName="summaryPrompt"
          value={cfg()?.summaryPrompt}
          label="Summary Prompt"
          helperText='When summarising the chat to an image caption, this is the "prompt" sent to OpenAI to summarise your conversation into an image prompt.'
          placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
        />

        <Toggle
          fieldName="summariseChat"
          label="Summarise Chat"
          helperText="When available use your AI service to summarise the chat into an image prompt. Only available with services with Instruct capabilities (Agnai, NovelAI, OpenAI, Claude, etc)"
          value={cfg()?.summariseChat}
        />
      </form>
    </RootModal>
  )
}

const NovelSettings: Component<{ cfg: ImageSettings | undefined }> = (props) => {
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
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg?.novel?.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
      />
    </>
  )
}

const HordeSettings: Component<{ cfg: ImageSettings | undefined }> = (props) => {
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
        value={props.cfg?.horde?.model || 'stable_diffusion'}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg?.horde?.sampler || SD_SAMPLER['DPM++ 2M']}
      />
    </>
  )
}

const SDSettings: Component<{ cfg: ImageSettings | undefined }> = (props) => {
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
        value={props.cfg?.sd?.url}
      />
      <Select
        fieldName="sdSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg?.sd?.sampler || SD_SAMPLER['DPM++ 2M']}
      />
    </>
  )
}

const AgnaiSettings: Component<{ cfg: ImageSettings | undefined }> = (props) => {
  const settings = settingStore((s) => {
    const models = s.config.serverConfig?.imagesModels || []
    return {
      models,
      names: models.map((m) => ({ label: m.desc.trim(), value: m.id || m.name })),
    }
  })

  const [curr, setCurr] = createSignal(props.cfg?.agnai?.model)
  const [sampler, setSampler] = createSignal(props.cfg?.agnai?.sampler)

  createEffect(
    on(
      () => props.cfg,
      () => {
        setCurr(props.cfg?.agnai?.model)
        setSampler(props.cfg?.agnai?.sampler || SD_SAMPLER['Euler a'])
      }
    )
  )

  const model = createMemo(() => {
    const original = props.cfg?.agnai?.model
    const id =
      settings.models.length === 1
        ? settings.models[0].id || settings.models[0].name
        : curr() || original
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
        value={curr()}
        disabled={settings.models.length <= 1}
        classList={{ hidden: settings.models.length === 0 }}
        onChange={(ev) => setCurr(ev.value)}
      />

      <Select
        fieldName="agnaiSampler"
        items={samplers()}
        label={`Sampler ${sampler()}`}
        value={sampler()}
        onChange={(ev) => setSampler(ev.value)}
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
