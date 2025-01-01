import { Component, Show, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'
import { toBotMsg, toUserMsg } from '../../../common/dummy'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { createDebounce, toDropdownItems } from '../../shared/util'
import { characterStore, settingStore, userStore } from '../../store'
import Message from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'
import ColorPicker from '/web/shared/ColorPicker'
import { FormLabel } from '/web/shared/FormLabel'
import { UI } from '/common/types'
import { Save } from 'lucide-solid'
import { Card } from '/web/shared/Card'
import Sortable, { SortItem } from '/web/shared/Sortable'
import { defaultUIsettings } from '/common/types/ui'

const themeOptions = UI.UI_THEME.map((color) => ({ label: color, value: color }))

function noop() {}

const msgInlineLabels: Record<UI.MessageOption, string> = {
  edit: 'Edit',
  regen: 'Regenerate',
  prompt: 'Prompt View',
  fork: 'Fork',
  trash: 'Delete',
  'schema-regen': 'Retry Schema',
}

const UISettings: Component<{}> = () => {
  const state = userStore()
  const chars = characterStore()
  const settings = settingStore()

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
  }

  createEffect(
    on(
      () => state.ui.msgOptsInline,
      (opts) => {
        if (inline().length) return

        const next = Object.entries(opts).map(([key, item], i) => ({
          id: i,
          value: key,
          label: msgInlineLabels[key as UI.MessageOption],
          enabled: item.outer,
        }))
        setInline(next)
      }
    )
  )

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

      <FileInput
        fieldName="background"
        label="Background Image"
        onUpdate={onBackground}
        accept="image/png,image/jpeg,image/jpg"
      />
      <div class="my-2 w-full justify-center">
        <Button onClick={() => userStore.setBackground(null)}>Remove Background</Button>
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

      <Card>
        <FormLabel
          label="Inline Message Options"
          helperText="Enable which message options appear 'inline' in a message. The rest will reside in the 'more options' drop menu"
        ></FormLabel>
        <Show when={inline().length > 0}>
          <Sortable items={inline()} onChange={updateInline} />
        </Show>
      </Card>

      <Toggle
        label="Trim Incomplete Sentences"
        fieldName="trimSentences"
        value={state.ui.trimSentences ?? false}
        onChange={(next) => userStore.saveUI({ trimSentences: next })}
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

      <Toggle
        fieldName="contextWindowLine"
        label="Show context window delineator"
        helperText="Shows a dotted line above which messages are no longer inserted in the prompt"
        value={state.ui.contextWindowLine}
        onChange={(ev) => userStore.saveUI({ contextWindowLine: ev })}
      />

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
            <span>
              . This will override the <b>Message Background</b>.{' '}
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

      <Select
        fieldName="chatWidth"
        label="Content Width"
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

      <Toggle
        fieldName="imageWrap"
        label="Avatar Wrap Around"
        helperText='Allow text in messages to "wrap around" avatars'
        onChange={(value) => userStore.saveUI({ imageWrap: value })}
        value={state.ui.imageWrap}
      />

      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <Show when={chars.characters.list.length > 0}>
        <div class="bg-600 flex w-full flex-col gap-2 rounded-md p-2">
          <Message
            index={-1}
            editing={false}
            msg={toBotMsg(
              chars.characters.list[0],
              '*I wave excitedly* Hello world!\nHow are you today?',
              {
                _id: '1',
              }
            )}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
          />

          <Show when={state.profile}>
            <Message
              index={-1}
              editing={false}
              msg={toUserMsg(
                state.profile!,
                '*I wave back* Hi {{char}}!\nFancy meeting you here! I heard someone say "The weather is great today!"',
                { _id: '2' }
              )}
              onRemove={noop}
              sendMessage={() => {}}
              isPaneOpen={false}
            />
          </Show>
        </div>
      </Show>
    </>
  )
}

export default UISettings
