import { Component, Show, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput, { InlineRangeInput } from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { createDebounce, createEmitter, toDropdownItems } from '../../shared/util'
import { characterStore, promptStore, settingStore, userStore } from '../../store'
import Message, { Typewriter } from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'
import ColorPicker from '/web/shared/ColorPicker'
import { FormLabel } from '/web/shared/FormLabel'
import { UI } from '/common/types'
import { Save, X } from 'lucide-solid'
import { Card } from '/web/shared/Card'
import Sortable, { SortItem } from '/web/shared/Sortable'
import { defaultUIsettings } from '/common/types/ui'
import { neat } from '/common/util'

const themeOptions = UI.UI_THEME.map((color) => ({ label: color, value: color }))

function noop() {}

const msgInlineLabels: Record<UI.MessageOption, string> = {
  edit: 'Edit',
  regen: 'Regenerate',
  prompt: 'Prompt View',
  fork: 'Fork',
  trash: 'Delete',
  attach: 'Attach',
  'schema-regen': 'Retry Schema',
  visible: 'Visibility',
  'gen-image': 'Gen Image',
}

const UISettings: Component<{}> = () => {
  const state = userStore((s) => ({
    ui: s.ui,
    current: s.current,
    background: s.background,
    profile: s.profile,
    user: s.user,
  }))
  const chars = characterStore((s) => ({
    characters: s.characters,
    impersonating: s.impersonating,
  }))
  const settings = settingStore((s) => ({ anonymize: s.anonymize }))
  const prompts = promptStore((s) => ({ hintsEnabled: s.hintsEnabled }))

  const themeBgOptions = createMemo(() => {
    const options = UI.BG_THEME.map((color) => ({ label: color as string, value: color as string }))
    const custom = state.current.bgCustom || ''
    if (custom !== '') return [{ label: 'Custom', value: '' }]
    return options
  })

  const onBackground = async (results: FileInputResult[]) => {
    if (!results.length) return
    const [result] = results

    userStore.setBackground(result)
  }

  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => unsubCustomUi())

  const [inline, setInline] = createSignal<SortItem[]>([])

  // const receiveInlineItems = ()

  const updateInline = (items: SortItem[]) => {
    const next = { ...defaultUIsettings.msgOptsInline }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      next[item.value as UI.MessageOption] = {
        outer: !!item.enabled,
        pos: i,
      }
    }

    userStore.saveUI({ msgOptsInline: next })
    setInline(toInlineList(next))
  }

  createEffect(
    on(
      () => state.ui.msgOptsInline,
      (opts) => {
        if (inline().length) return

        setInline(toInlineList(opts))
      }
    )
  )

  const twReset = createEmitter('reset')

  return (
    <>
      <h3 class="text-lg font-bold">Theme</h3>
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="theme"
          items={themeOptions}
          label="Color"
          value={state.ui.theme}
          onChange={(item) => userStore.saveUI({ theme: item.value as any })}
        />

        <Select
          fieldName="mode"
          label="Mode"
          items={[
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
          ]}
          value={state.ui.mode}
          onChange={(item) => userStore.saveUI({ mode: item.value as any })}
        />
      </div>
      <div class="flex flex-col">
        <FormLabel
          label="Backgrounds"
          helperText={
            <>
              <span class="link" onClick={() => userStore.saveCustomUI({ bgCustom: '' })}>
                Reset to Default
              </span>
            </>
          }
        />
        <div class="flex items-center gap-2">
          <Select
            fieldName="themeBg"
            inline
            label="Background Color"
            items={themeBgOptions()}
            value={state.ui.themeBg}
            onChange={(item) => userStore.saveUI({ themeBg: item.value })}
          />
          <ColorPicker
            fieldName="customBg"
            onChange={(color) => userStore.saveCustomUI({ bgCustom: color })}
            onInput={(color) => tryCustomUI({ bgCustom: color })}
            value={state.current.bgCustom ?? state.ui[state.ui.mode].bgCustom}
          />
        </div>
      </div>

      <div class="flex items-end gap-2">
        <FileInput
          fieldName="background"
          label="Background Image"
          onUpdate={onBackground}
          accept="image/png,image/jpeg,image/jpg"
        />
        <div class="w-full justify-center">
          <Button disabled={!state.background} onClick={() => userStore.setBackground(null)}>
            <X size={16} />
            Remove
          </Button>
        </div>
      </div>

      <Select
        fieldName="font"
        label="Font"
        items={[
          { label: 'Default', value: 'default' },
          { label: 'Lato (Roko)', value: 'lato' },
        ]}
        value={state.ui.font}
        onChange={(item) => userStore.saveUI({ font: item.value as any })}
      />

      <Divider />
      <h3 class="text-md font-bold">Chat Settings</h3>

      <Toggle
        label="Response Hints"
        helperText="Add a hint to your message to guide the response"
        value={prompts.hintsEnabled}
        onChange={(ev) => promptStore.toggleHints(ev)}
      />

      <Toggle
        fieldName="imageWrap"
        label="Avatar Wrap Around"
        helperText='Allow text in messages to "wrap around" avatars'
        onChange={(value) => userStore.saveUI({ imageWrap: value })}
        value={state.ui.imageWrap}
      />

      <Toggle
        label="Trim Incomplete Sentences"
        fieldName="trimSentences"
        value={state.ui.trimSentences ?? false}
        onChange={(next) => userStore.saveUI({ trimSentences: next })}
      />

      <Toggle
        label="Expand Reasoning by Default"
        helperText="Reasoning thoughts are collapsed by default. Enable this to expand them by default."
        fieldName="expandReasoning"
        value={state.ui.expandReasoning ?? false}
        onChange={(next) => userStore.saveUI({ expandReasoning: next })}
      />

      <Select
        items={[
          { value: '', label: 'Default (All)' },
          { value: 'all', label: 'All' },
          { value: 'post', label: 'After Thought' },
          { value: 'pre', label: 'Before Thought' },
        ]}
        label="Mid-Reasoning Behavior"
        helperMarkdown={neat`When reasoning is in the middle of a response, which utterance (i.e., non-thought) should be kept`}
        value={state.ui.displayReasoning}
        onChange={(next) => userStore.saveUI({ displayReasoning: next.value as any })}
      />

      <Toggle
        value={settings.anonymize}
        label="Anonymize Chat"
        helperText="Hide profile name in conversations. Typically for screenshots."
        onChange={() => settingStore.toggleAnonymize()}
      />

      <Toggle
        fieldName="mobileSendOnEnter"
        label="Send on Enter on Mobile"
        helperText='Instead of adding a line break, "Enter" will send the message (Mobile only)'
        value={state.ui.mobileSendOnEnter}
        onChange={(ev) => userStore.saveUI({ mobileSendOnEnter: ev })}
      />

      <Card border class="!my-1 !px-2 !py-1">
        <div class="flex w-full flex-col">
          <div class="flex gap-1">
            <InlineRangeInput
              label="Text Speed"
              parentClass="w-full"
              // helperMarkdown='Speed of the "typewriter" effect when receiving new messages. Set to `0` to disable.'
              value={state.ui.textSpeed ?? 0}
              min={0}
              max={100}
              step={1}
              onChange={(ev) => {
                userStore.tryUI({ textSpeed: ev })
                twReset.emit.reset()
              }}
            />
            <Button
              size="sm"
              class="!py-2"
              onClick={() => userStore.saveUI({ textSpeed: state.ui.textSpeed })}
            >
              Save
            </Button>
          </div>
          <FormLabel helperMarkdown="Control the speed that text streams in. Set to `0` to disable." />

          <Typewriter
            class="!text-700 text-sm"
            text="There are ten types of people in the world. Those who understand binary and those who don't."
            speed={state.ui.textSpeed}
            reset={twReset}
          />
        </div>
      </Card>
      {/* <Toggle
        fieldName="contextWindowLine"
        label="Show context window delineator"
        helperText="Shows a dotted line above which messages are no longer inserted in the prompt"
        value={state.ui.contextWindowLine}
        onChange={(ev) => userStore.saveUI({ contextWindowLine: ev })}
      /> */}

      <Select
        fieldName="chatMode"
        label="View Mode"
        helperText={
          <>
            <b>Standard</b>: Messages take up the entire chat screen.
            <br />
            <b>Split</b>: Character's avatar appears at the top of the screen
            <br />
            <b>Background</b>: Character's avatar will become the Chat Background
          </>
        }
        items={[
          { label: 'Standard', value: 'standard' },
          { label: 'Split', value: 'split' },
          { label: 'Background: Auto', value: 'background' },
          { label: 'Background: Cover', value: 'background-cover' },
          { label: 'Background: Contain', value: 'background-contain' },
        ]}
        value={state.ui.viewMode || 'standard'}
        onChange={(next) => userStore.saveUI({ viewMode: next.value as any })}
      />

      <div class="flex w-full items-center justify-between gap-2">
        <RangeInput
          parentClass="w-full"
          fieldName="chatModeHeight"
          min={25}
          max={65}
          step={1}
          label="Split Height (%)"
          helperText={`Maximum height of the character's avatar when in split mode`}
          value={state.ui.viewHeight || 40}
          onChange={(value) => userStore.tryUI({ viewHeight: value })}
        />
        <Button onClick={() => userStore.saveUI({ viewHeight: state.ui.viewHeight || 40 })}>
          <Save />
        </Button>
      </div>

      <div class="flex w-full items-center justify-between gap-2">
        <RangeInput
          parentClass="w-full"
          fieldName="chatAlternating"
          min={0}
          max={25}
          step={1}
          label="Message Alternating (%)"
          helperText={`Message bubble width reduction for alternating based on author`}
          value={state.ui.chatAlternating || 0}
          onChange={(value) => userStore.tryUI({ chatAlternating: value })}
        />
        <Button
          onClick={() => userStore.saveUI({ chatAlternating: state.ui.chatAlternating || 0 })}
        >
          <Save />
        </Button>
      </div>

      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="avatarSize"
          label="Size"
          items={toDropdownItems(UI.AVATAR_SIZES)}
          value={state.ui.avatarSize}
          onChange={(item) => userStore.saveUI({ avatarSize: item.value as any })}
        />
        <Select
          fieldName="avatarCorners"
          label="Corner Radius"
          items={toDropdownItems(UI.AVATAR_CORNERS)}
          value={state.ui.avatarCorners}
          onChange={(item) => userStore.saveUI({ avatarCorners: item.value as any })}
        />
      </div>

      <ColorPicker
        label="Message Background Color"
        fieldName="messageColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ msgBackground: 'bg-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ msgBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ msgBackground: color })}
        value={state.current.msgBackground}
      />

      <ColorPicker
        label="Bot Message Background Color"
        fieldName="botMessageColor"
        helperText={
          <>
            <span class="link" onClick={() => userStore.saveCustomUI({ botBackground: 'bg-800' })}>
              Reset to Default
            </span>
          </>
        }
        onInput={(color) => tryCustomUI({ botBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ botBackground: color })}
        value={state.current.botBackground}
      />

      <ColorPicker
        label="Chat Text Color"
        fieldName="chatTextColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatTextColor: 'text-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatTextColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatTextColor: color })}
        value={state.current.chatTextColor}
      />

      <ColorPicker
        label="Chat Emphasis Color"
        fieldName="chatEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.saveCustomUI({ chatEmphasisColor: 'text-600' })}
          >
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatEmphasisColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatEmphasisColor: color })}
        value={state.current.chatEmphasisColor}
      />

      <ColorPicker
        label="Chat Quote Color"
        fieldName="chatQuoteColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatQuoteColor: 'text-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatQuoteColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatQuoteColor: color })}
        value={state.current.chatQuoteColor || '--text-800'}
      />

      <ColorPicker
        label="Chat Quote Emphasis Color"
        fieldName="chatQuoteEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.saveCustomUI({ chatQuoteEmphasisColor: 'text-800' })}
          >
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatQuoteEmphasisColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatQuoteEmphasisColor: color })}
        value={state.current.chatQuoteEmphasisColor || '--text-800'}
      />

      <Select
        fieldName="chatQuoteEmphasisWeight"
        label="Chat Quote Emphasis Weight"
        inline
        items={[
          { label: 'None', value: 'unset' },
          { label: 'Bold', value: 'bold' },
        ]}
        onChange={(item) =>
          userStore.saveCustomUI({ chatQuoteEmphasisWeight: item.value as string })
        }
        value={state.current.chatQuoteEmphasisWeight || 'unset'}
      />

      <Select
        fieldName="chatWidth"
        label="Content Width"
        inline
        items={[
          { label: 'Narrow', value: 'narrow' },
          { label: 'Large', value: 'full' },
          { label: 'X-Large', value: 'xl' },
          { label: '2X-Large', value: '2xl' },
          { label: '3X-Large', value: '3xl' },
          { label: '100%', value: 'fill' },
        ]}
        onChange={(item) => userStore.saveUI({ chatWidth: item.value as any })}
        value={state.ui.chatWidth}
      />
      <RangeInput
        fieldName="msgOpacity"
        value={state.ui.msgOpacity}
        step={0.05}
        label="Message Opacity"
        helperText="The opacity of the message block in the chat window."
        min={0}
        max={1}
        onChange={(value) => userStore.saveUI({ msgOpacity: value })}
      />

      <Divider />

      <FormLabel
        label="Inline Message Options"
        helperText="Enable which message options appear 'inline' in a message. The rest will reside in the 'more options' drop menu"
      ></FormLabel>
      <Show when={inline().length > 0}>
        <Sortable items={inline()} onChange={updateInline} />
      </Show>

      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <Show when={chars.characters.list.length > 0}>
        <div class="bg-600 flex w-full flex-col gap-2 rounded-md p-2">
          <Message
            index={-1}
            editing={false}
            messageId={'example-msg-1'}
            content={'*I wave excitedly* Hello world!\nHow are you today?'}
            characterId={chars.characters.list[0]?._id}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
            preset={undefined}
          />

          <Show when={state.profile}>
            <Message
              index={-1}
              editing={false}
              messageId={'example-msg-2'}
              content='*I wave back* Hi {{char}}!\nFancy meeting you here! I heard someone say "The weather is great today!"\n"How about we have some *fun* today?"'
              characterId={chars.impersonating?._id}
              userId={state.user?._id}
              onRemove={noop}
              sendMessage={() => {}}
              isPaneOpen={false}
              preset={undefined}
            />
          </Show>
        </div>
      </Show>
    </>
  )
}

export default UISettings

function toInlineList(opts: UI.UISettings['msgOptsInline']) {
  const next = Object.entries(opts).map(([key, item], i) => ({
    id: i,
    value: key,
    label: msgInlineLabels[key as UI.MessageOption],
    enabled: item.outer,
  }))

  return next
}
