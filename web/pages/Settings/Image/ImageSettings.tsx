import { Match, Show, Switch, createMemo, createSignal } from 'solid-js'
import Divider from '../../../shared/Divider'
import { InlineRangeInput } from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { chatStore, imageStore, presetStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { SolidCard } from '/web/shared/Card'
import Tabs from '/web/shared/Tabs'
import Button, { ToggleButton } from '/web/shared/Button'
import { Pencil, Save, X } from 'lucide-solid'
import Modal, { RootModal } from '/web/shared/Modal'
import { isChatPageMemo } from '/web/shared/hooks'
import {
  AgnaiSettings,
  HordeSettings,
  NovelSettings,
  SDSettings,
  SwarmSettings,
} from './ServiceSettings'
import { FormLabel } from '/web/shared/FormLabel'
import { PresetSelect } from '/web/shared/PresetSelect'
import { getPresetOptions } from '/web/shared/adapter'
import Accordian from '/web/shared/Accordian'
import { ModeGenSettings } from '/web/shared/Mode/ModeGenSettings'
import { usePresetContext } from '/web/store/preset-context'
import { useImageContext } from './image-context'

export const ImageSettingsModal = () => {
  const isChat = isChatPageMemo(true)
  const [ctx] = useImageContext()
  const settings = imageStore((s) => ({ showImgSettings: s.showImgSettings }))

  const [summaryPreset, presetSetters] = usePresetContext({ anonymous: true })
  const [presetFooter, setPresetFooter] = createSignal<any>()
  const presets = presetStore((s) => ({
    list: s.presets,
    options: s.presets.map((pre) => ({ label: pre.name, value: pre._id })),
  }))

  const entity = chatStore((s) => ({
    chat: s.details[s.lastChatId]?.chat,
    char: s.details[s.lastChatId]?.char,
  }))

  const [editPreset, setEditPreset] = createSignal(false)

  const isAllEnabled = createMemo(() => Array.from(Object.values(ctx.defaults)).every((v) => !!v))

  const editPresetClicked = () => {
    if (!ctx.store.summaryPresetId) return
    presetSetters.load(ctx.store.summaryPresetId)
    setEditPreset(true)
  }

  const presetOptions = createMemo(() =>
    getPresetOptions(presets.list, { builtin: true, base: true })
  )

  const subclass = 'flex flex-col gap-4'

  return (
    <>
      <RootModal
        maxWidth="half"
        show={settings.showImgSettings}
        close={() => imageStore.imageSettings(false)}
        footer={
          <>
            <Button onClick={() => imageStore.imageSettings(false)}>
              <X /> Close
            </Button>
            <Button onClick={() => ctx.save()}>
              <Save /> Save
            </Button>
          </>
        }
      >
        <form class="flex flex-col gap-4">
          <Switch>
            <Match when={ctx.tab.current() === 'Shared'}>
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
            <Match when={ctx.tab.current() === 'Character'}>
              <SolidCard type="hl">
                <div>Character Settings</div>
                <div class="text-500 text-sm italic">Character: {entity.char?.name}</div>
              </SolidCard>
            </Match>
            <Match when={ctx.tab.current() === 'Chat'}>
              <SolidCard type="hl">
                <div>Current Chat Settings</div>
                <div class="text-500 text-sm italic">Chatting with: {entity.char?.name}</div>
              </SolidCard>
            </Match>
          </Switch>

          <Tabs tabs={ctx.tab.tabs()} select={ctx.tab.select} selected={ctx.tab.selected} />

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
                  chatStore.editChat(entity.chat?._id!, { imageSource: ctx.state.editing })
                }
              >
                <Show
                  when={ctx.state.source === ctx.state.editing}
                  fallback={`Use ${ctx.tab.current()} Settings`}
                >
                  Use {ctx.tab.current()} Settings (Active)
                </Show>
              </Button>
            </div>
          </Show>

          <PresetSelect
            label={<span class="!text-lg">Summary Preset</span>}
            helperText="Choose which service and model is used for creating summaries for chat images"
            options={presetOptions()}
            setPresetId={(id) => ctx.update('summaryPresetId', id)}
            selected={ctx.store.summaryPresetId}
          >
            <Button disabled={!ctx.store.summaryPresetId} onClick={editPresetClicked}>
              <Pencil size={20} />
            </Button>
          </PresetSelect>

          <Accordian title="Summary Settings" titleClickOpen open={false}>
            <Toggle
              fieldName="summariseChat"
              label="Summarise Chat"
              helperText="Use your AI service to summarise the chat into an image prompt."
              value={ctx.store.summariseChat}
              onChange={(ev) => ctx.update('summariseChat', ev)}
            />

            <TextInput
              fieldName="summaryPrompt"
              label="Summary Prompt"
              isMultiline
              helperText='When summarising the chat to an image caption, this is the "prompt" is used summarise your conversation into an image prompt.'
              placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
              value={ctx.store.summaryPrompt}
              onChange={(ev) => ctx.update('summaryPrompt', ev.currentTarget.value)}
            />

            <div class="flex gap-1">
              <Button size="sm" onClick={() => ctx.update('summaryPrompt', SUMMARY_PROMPTS.booru)}>
                Booru/Tag Style
              </Button>
              <Button size="sm" onClick={() => ctx.update('summaryPrompt', SUMMARY_PROMPTS.plain)}>
                Flux/Plain Style
              </Button>
            </div>
          </Accordian>

          <div class="flex gap-2">
            <Select
              fieldName="imageType"
              items={ctx.state.hosts}
              value={ctx.store.type ?? (ctx.state.canUseImages ? 'agnai' : 'horde')}
              onChange={(value) => ctx.update('type', value.value as any)}
              class="!py-1"
              inline
            />
            {/* <Button size="sm" class="h-[36px]">
              <Plus size={20} />
              Service
            </Button> */}
          </div>

          <Show when={ctx.state.canUseImages && ctx.store.type === 'agnai'}>
            <FormLabel
              label="Use Recommended Settings"
              helperText="Use the image model's recommended settings when available."
            />
            <div class="flex flex-wrap justify-center gap-2">
              <ToggleButton
                size="sm"
                value={isAllEnabled()}
                onChange={(ev) => ctx.toggleDefaults(ev)}
              >
                Toggle All
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.affixes}
                onChange={(ev) => ctx.updateDefaults('affixes', ev)}
              >
                Affixes
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.size}
                onChange={(ev) => ctx.updateDefaults('size', ev)}
              >
                Size
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.guidance}
                onChange={(ev) => ctx.updateDefaults('guidance', ev)}
              >
                Guidance
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.steps}
                onChange={(ev) => ctx.updateDefaults('steps', ev)}
              >
                Steps
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.negative}
                onChange={(ev) => ctx.updateDefaults('negative', ev)}
              >
                Negative Prompt
              </ToggleButton>
              <ToggleButton
                size="sm"
                value={ctx.defaults.sampler}
                onChange={(ev) => ctx.updateDefaults('sampler', ev)}
              >
                Sampler
              </ToggleButton>
            </div>
          </Show>

          <div class={ctx.store.type === 'novel' ? subclass : 'hidden'}>
            <NovelSettings cfg={ctx.store} setter={ctx.update} />
          </div>

          <div class={ctx.store.type === 'horde' ? subclass : 'hidden'}>
            <HordeSettings cfg={ctx.store} setter={ctx.update} />
          </div>

          <div
            class={ctx.tab.current() === 'Shared' && ctx.store.type === 'sd' ? subclass : 'hidden'}
          >
            <SDSettings cfg={ctx.store} setter={ctx.update} />
          </div>

          <div
            class={
              ctx.tab.current() === 'Shared' && ctx.store.type === 'swarm' ? subclass : 'hidden'
            }
          >
            <SwarmSettings cfg={ctx.store} setter={ctx.update} />
          </div>

          <div class={ctx.store.type === 'agnai' ? subclass : 'hidden'}>
            <AgnaiSettings cfg={ctx.store} setter={ctx.update} />
          </div>

          <Divider />

          <Show when={ctx.store.type === 'agnai'}>
            <SolidCard bg="rose-600">
              Refer to the recommended settings when using Agnaistic image models
            </SolidCard>
          </Show>

          <InlineRangeInput
            fieldName="imageSteps"
            min={5}
            max={128}
            step={1}
            value={ctx.store.steps ?? ctx.state.agnaiModel?.init.steps ?? 50}
            label="Sampling Steps"
            onChange={(ev) => ctx.update('steps', ev)}
          />

          <InlineRangeInput
            fieldName="imageClipSkip"
            min={0}
            max={4}
            step={1}
            value={ctx.store.clipSkip ?? ctx.state.agnaiModel?.init.clipSkip ?? 0}
            label="Clip Skip"
            onChange={(ev) => ctx.update('clipSkip', ev)}
          />

          <InlineRangeInput
            fieldName="imageWidth"
            min={256}
            max={1280}
            step={128}
            value={ctx.store.width ?? ctx.state.agnaiModel?.init.width ?? 1024}
            label="Image Width"
            onChange={(ev) => ctx.update('width', ev)}
          />

          <InlineRangeInput
            fieldName="imageHeight"
            min={256}
            max={1280}
            step={128}
            value={ctx.store.height ?? ctx.state.agnaiModel?.init.height ?? 1024}
            label="Image Height"
            onChange={(ev) => ctx.update('height', ev)}
          />

          <InlineRangeInput
            fieldName="imageCfg"
            value={ctx.store.cfg ?? ctx.state.agnaiModel?.init.cfg ?? 9}
            label="Guidance Scale"
            min={1}
            max={10}
            step={0.2}
            onChange={(ev) => ctx.update('cfg', ev)}
          />

          <TextInput
            fieldName="seed"
            value={ctx.store.seed ?? 0}
            label="Seed"
            type="number"
            helperText="Seed number (0 = random). Note: The seed will not be consistent across different servers."
            onChange={(ev) =>
              ctx.update(
                'seed',
                Math.max(0, Math.min(+ev.currentTarget.value, Number.MAX_SAFE_INTEGER))
              )
            }
          />

          <TextInput
            fieldName="imagePrefix"
            value={ctx.store.prefix}
            label="Prompt Prefix"
            helperText="(Optional) Text to prepend to your image prompt"
            placeholder={`E.g.: best quality, masterpiece`}
            onChange={(ev) => ctx.update('prefix', ev.currentTarget.value)}
          />

          <TextInput
            fieldName="imageSuffix"
            value={ctx.store.suffix}
            label="Prompt Suffix"
            helperText="(Optional) Text to append to your image prompt"
            placeholder={`E.g.: full body, visible legs, dramatic lighting`}
            onChange={(ev) => ctx.update('suffix', ev.currentTarget.value)}
          />

          <TextInput
            fieldName="imageNegative"
            label="Negative Prompt"
            helperText="(Optional) Negative Prompt"
            placeholder={`E.g.: painting, drawing, illustration, glitch, deformed, mutated, cross-eyed, disfigured`}
            value={ctx.store.negative}
            onChange={(ev) => ctx.update('negative', ev.currentTarget.value)}
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
          preset={summaryPreset.current}
          setters={presetSetters}
          close={() => setEditPreset(false)}
          presetId={ctx.store.summaryPresetId}
          onPresetChanged={() => setEditPreset(false)}
          footer={setPresetFooter}
        />
      </Modal>
    </>
  )
}

export type ChatImageSettings = ReturnType<ReturnType<typeof useCurrentChatImageSettings>>

export function useCurrentChatImageSettings() {
  const isChat = isChatPageMemo()

  const user = userStore((s) => ({ cfg: s.user?.images }))
  const entity = chatStore((s) => ({
    chat: s.details[s.lastChatId]?.chat,
    char: s.details[s.lastChatId]?.char,
  }))

  const cfg = createMemo(() => {
    if (!isChat() || !entity.chat) return { chatId: undefined, ...user.cfg }

    if (
      !entity.chat.imageSource ||
      entity.chat.imageSource === 'chat' ||
      !entity.char?.imageSettings
    ) {
      return { chatId: entity.chat._id, ...entity.chat.imageSettings }
    }

    return { chatId: entity.chat._id, ...entity.char.imageSettings }
  })

  return cfg
}

const SUMMARY_PROMPTS = {
  booru: `Write an image caption of the current moment using physical descriptions without names. Respond using comma-separated BOORU TAGS`,
  plain: `Write an image caption of the current moment using physical descriptions without names. Respond using comma-separated simple descriptors`,
  simple: `Write a Brief image caption of the current moment using physical descriptions without names. Respond using comma-separated simple descriptors`,
}
// `Write an image caption of the current moment in time using physical descriptions without names. Respond using comma-separate BOORU TAGS.`
