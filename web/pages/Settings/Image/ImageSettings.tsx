import { Match, Show, Switch, createMemo, createSignal } from 'solid-js'
import Divider from '../../../shared/Divider'
import TextInput from '../../../shared/TextInput'
import { chatStore, imageStore, presetStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { SolidCard } from '/web/shared/Card'
import Tabs from '/web/shared/Tabs'
import Button, { ToggleButton } from '/web/shared/Button'
import { Pencil, Save, X } from 'lucide-solid'
import Modal, { RootModal } from '/web/shared/Modal'
import { isChatPageMemo } from '/web/shared/hooks'
import { FormLabel } from '/web/shared/FormLabel'
import { PresetSelect } from '/web/shared/PresetSelect'
import { getPresetOptions } from '/web/shared/adapter'
import Accordian from '/web/shared/Accordian'
import { ModeGenSettings } from '/web/shared/Mode/ModeGenSettings'
import { usePresetContext } from '/web/store/preset-context'
import { useImageContext } from './image-context'
import { SelectImageProvider } from './ImageProvider'
import { ImageSamplers } from './ImageSamplers'
import { ImagePreset } from './ImagePreset'

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
    if (!ctx.edit.preset.summaryPresetId) return
    presetSetters.load(ctx.edit.preset.summaryPresetId)
    setEditPreset(true)
  }

  const presetOptions = createMemo(() =>
    getPresetOptions(presets.list, { builtin: true, base: true })
  )

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
                <div class="text-600 text-sm italic">
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
                label={`Chat Image Generation Settings Source`}
                helperText='Control which image generation settings are used when generating "Chat Images"'
              />
              <Button
                size="sm"
                class="w-fit"
                onClick={() => ctx.changeChatSource(entity.chat?._id!)}
              >
                <Show
                  when={ctx.state.source === ctx.editingSource().source}
                  fallback={`Use ${ctx.tab.current()} Settings`}
                >
                  Use {ctx.tab.current()} Settings (Active)
                </Show>
              </Button>
            </div>
          </Show>

          <ImagePreset ctx={ctx} />

          <Accordian title="Image Caption Settings" titleClickOpen open={false}>
            <PresetSelect
              label={<span class="!text-lg">Summary Preset</span>}
              helperText="Choose which service and model is used for creating summaries for chat images"
              options={presetOptions()}
              setPresetId={(id) => ctx.updatePreset({ summaryPresetId: id })}
              selected={ctx.edit.preset.summaryPresetId}
            >
              <Button disabled={!ctx.edit.preset.summaryPresetId} onClick={editPresetClicked}>
                <Pencil size={20} />
              </Button>
            </PresetSelect>

            <TextInput
              fieldName="summaryPrompt"
              label="Summary Prompt"
              isMultiline
              helperText="When summarising the chat to an image caption, this is the prompt used summarise your conversation into an image prompt"
              placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
              value={ctx.edit.preset.summaryPrompt}
              onChange={(ev) => ctx.updatePreset({ summaryPrompt: ev.currentTarget.value })}
            />

            <div class="flex gap-1">
              <Button
                size="sm"
                onClick={() => ctx.updatePreset({ summaryPrompt: SUMMARY_PROMPTS.booru })}
              >
                Booru/Tag Style
              </Button>
              <Button
                size="sm"
                onClick={() => ctx.updatePreset({ summaryPrompt: SUMMARY_PROMPTS.plain })}
              >
                Flux/Plain Style
              </Button>
            </div>
          </Accordian>

          <SelectImageProvider ctx={ctx} editable />
          <Divider />
          <ImageSamplers ctx={ctx} />

          <Show when={ctx.state.canUseImages && ctx.edit.provider.type === 'agnai'}>
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
          <Divider />

          <Show when={ctx.edit.provider.type === 'agnai'}>
            <SolidCard bg="rose-600">
              Refer to the recommended settings when using Agnaistic image models
            </SolidCard>
          </Show>
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
          presetId={ctx.edit.preset.summaryPresetId}
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
