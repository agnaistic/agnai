import { Match, Show, Switch, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { SD_SAMPLER } from '../../../../common/image'
import Divider from '../../../shared/Divider'
import { InlineRangeInput } from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { characterStore, chatStore, presetStore, settingStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { SolidCard } from '/web/shared/Card'
import Tabs, { useTabs } from '/web/shared/Tabs'
import Button, { ToggleButton } from '/web/shared/Button'
import { Pencil, Save, X } from 'lucide-solid'
import Modal, { RootModal } from '/web/shared/Modal'
import { ImageSettings } from '/common/types/image-schema'
import { isChatPage } from '/web/shared/hooks'
import { createStore } from 'solid-js/store'
import { AgnaiSettings, HordeSettings, NovelSettings, SDSettings } from './ServiceSettings'
import { FormLabel } from '/web/shared/FormLabel'
import { PresetSelect } from '/web/shared/PresetSelect'
import { getPresetOptions } from '/web/shared/adapter'
import Accordian from '/web/shared/Accordian'
import { ModeGenSettings } from '/web/shared/Mode/ModeGenSettings'
import { usePresetContext } from '/web/store/preset-context'

const init: ImageSettings = {
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
}

export const ImageSettingsModal = () => {
  const user = userStore()
  const settings = settingStore()
  const [summaryPreset, presetSetters] = usePresetContext({ anonymous: true })
  const [presetFooter, setPresetFooter] = createSignal<any>()
  const presets = presetStore((s) => ({
    list: s.presets,
    options: s.presets.map((pre) => ({ label: pre.name, value: pre._id })),
  }))

  const entity = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
  }))

  const [editPreset, setEditPreset] = createSignal(false)
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

  const editPresetClicked = () => {
    if (!store.summaryPresetId) return
    presetSetters.load(store.summaryPresetId)
    setEditPreset(true)
  }

  const tab = useTabs<string[]>(
    [],
    isChat() && entity.chat?.imageSource === 'chat'
      ? 1
      : entity.chat?.imageSource?.includes('character')
      ? 2
      : 0
  )
  createEffect(() => {
    const tabs = ['Shared']

    if (entity.chat && isChat()) tabs.push('Chat')
    if (entity.char && isChat()) tabs.push('Character')

    return tab.update(tabs)
  })

  const currentChatImageSrc = createMemo(() => {
    return entity.chat?.imageSource || 'settings'
  })

  const currentImgSource = createMemo(() => {
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

  const imageTypes = createMemo(() => {
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

  const presetOptions = createMemo(() =>
    getPresetOptions(presets.list, { builtin: true, base: true })
  )

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

  const subclass = 'flex flex-col gap-4'

  return (
    <>
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
            <Match when={tab.current() === 'Shared'}>
              <SolidCard type="hl">
                <div>Shared Settings</div>
                <div class="text-500 text-sm italic">
                  <Show
                    when={!isChat()}
                    fallback={
                      <>
                        <b>Global/Default</b> Image Settings
                      </>
                    }
                  >
                    Note: <b>Chat</b> and <b>Character</b> image settings are only available when a
                    chat is open.
                  </Show>
                </div>
              </SolidCard>
            </Match>
            <Match when={tab.current() === 'Character'}>
              <SolidCard type="hl">
                <div>Character Settings</div>
                <div class="text-500 text-sm italic">Character: {entity.char?.name}</div>
              </SolidCard>
            </Match>
            <Match when={tab.current() === 'Chat'}>
              <SolidCard type="hl">
                <div>Current Chat Settings</div>
                <div class="text-500 text-sm italic">Chatting with: {entity.char?.name}</div>
              </SolidCard>
            </Match>
          </Switch>

          <Tabs tabs={tab.tabs()} select={tab.select} selected={tab.selected} />

          <Show when={isChat()}>
            <div class="flex flex-col gap-1">
              <FormLabel
                label={`Current Chat Image Settings Source`}
                helperText='Control which image settings are used when generating "Chat Images"'
              />
              <Button
                size="sm"
                class="w-fit"
                onClick={() =>
                  chatStore.editChat(
                    entity.chat?._id!,
                    { imageSource: currentImgSource() },
                    undefined
                  )
                }
              >
                <Show
                  when={currentChatImageSrc() === currentImgSource()}
                  fallback={`Use ${tab.current()} Settings`}
                >
                  Use {tab.current()} Settings (Active)
                </Show>
              </Button>
            </div>
          </Show>

          <PresetSelect
            label={<span class="!text-lg">Summary Preset</span>}
            helperText="Choose which service and model is used for creating summaries for chat images"
            options={presetOptions()}
            setPresetId={(id) => setStore('summaryPresetId', id)}
            selected={store.summaryPresetId}
          >
            <Button disabled={!store.summaryPresetId} onClick={editPresetClicked}>
              <Pencil size={20} />
            </Button>
          </PresetSelect>

          <Accordian title="Summary Settings" titleClickOpen open={false}>
            <Toggle
              fieldName="summariseChat"
              label="Summarise Chat"
              helperText="Use your AI service to summarise the chat into an image prompt."
              value={store.summariseChat}
              onChange={(ev) => setStore('summariseChat', ev)}
            />

            <TextInput
              fieldName="summaryPrompt"
              label="Summary Prompt"
              isMultiline
              helperText='When summarising the chat to an image caption, this is the "prompt" is used summarise your conversation into an image prompt.'
              placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
              value={store.summaryPrompt}
              onChange={(ev) => setStore('summaryPrompt', ev.currentTarget.value)}
            />
          </Accordian>

          <Select
            fieldName="imageType"
            items={imageTypes()}
            value={store.type ?? 'horde'}
            onChange={(value) => setStore('type', value.value as any)}
            class="!py-1"
            inline
          />

          <Show when={canUseImages() && store.type === 'agnai'}>
            <FormLabel
              label="Use Recommended Settings"
              helperText="Use the image model's recommended settings when available."
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

          <div class={tab.current() === 'Shared' && store.type === 'sd' ? subclass : 'hidden'}>
            <SDSettings cfg={store} setter={setStore} />
          </div>

          <div class={store.type === 'agnai' ? subclass : 'hidden'}>
            <AgnaiSettings cfg={store} setter={setStore} />
          </div>

          <Divider />

          <Show when={store.type === 'agnai'}>
            <SolidCard bg="rose-600">
              Refer to the recommended settings when using Agnaistic image models
            </SolidCard>
          </Show>

          <InlineRangeInput
            fieldName="imageSteps"
            min={5}
            max={128}
            step={1}
            value={store.steps ?? agnaiModel()?.init.steps ?? 50}
            label="Sampling Steps"
            onChange={(ev) => setStore('steps', ev)}
          />

          <InlineRangeInput
            fieldName="imageClipSkip"
            min={0}
            max={4}
            step={1}
            value={store.clipSkip ?? agnaiModel()?.init.clipSkip ?? 0}
            label="Clip Skip"
            onChange={(ev) => setStore('clipSkip', ev)}
          />

          <InlineRangeInput
            fieldName="imageWidth"
            min={256}
            max={1280}
            step={128}
            value={store.width ?? agnaiModel()?.init.width ?? 1024}
            label="Image Width"
            onChange={(ev) => setStore('width', ev)}
          />

          <InlineRangeInput
            fieldName="imageHeight"
            min={256}
            max={1280}
            step={128}
            value={store.height ?? agnaiModel()?.init.height ?? 1024}
            label="Image Height"
            onChange={(ev) => setStore('height', ev)}
          />

          <InlineRangeInput
            fieldName="imageCfg"
            value={store.cfg ?? agnaiModel()?.init.cfg ?? 9}
            label="Guidance Scale"
            min={1}
            max={10}
            step={0.2}
            onChange={(ev) => setStore('cfg', ev)}
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
        </form>
      </RootModal>

      <Modal
        title="Edit Summary Preset"
        show={editPreset()}
        close={() => setEditPreset(false)}
        maxWidth="half"
        footer={presetFooter()}
      >
        <ModeGenSettings
          page="image-settings"
          preset={summaryPreset}
          setters={presetSetters}
          close={() => setEditPreset(false)}
          presetId={store.summaryPresetId}
          onPresetChanged={() => setEditPreset(false)}
          footer={setPresetFooter}
        />
      </Modal>
    </>
  )
}

async function save(tab: string, store: ImageSettings, entity: any) {
  switch (tab) {
    case 'Shared': {
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
