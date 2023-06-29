import { Component, Show, onCleanup } from 'solid-js'
import { toBotMsg, toUserMsg } from '../../../common/dummy'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { createDebounce, toDropdownItems } from '../../shared/util'
import { userStore } from '../../store'
import Message from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'
import ColorPicker from '/web/shared/ColorPicker'
import { FormLabel } from '/web/shared/FormLabel'
import { UI } from '/common/types'
import { Save } from 'lucide-solid'
import { useAppContext } from '/web/store/context'

const themeOptions = UI.UI_THEME.map((color) => ({ label: color, value: color }))
const themeBgOptions = [{ label: 'Custom', value: '' }].concat(
  ...UI.BG_THEME.map((color) => ({ label: color, value: color }))
)

function noop() {}

const UISettings: Component = () => {
  const state = userStore()
  const [ctx] = useAppContext()

  const onBackground = async (results: FileInputResult[]) => {
    if (!results.length) return
    const [result] = results

    userStore.setBackground(result)
  }

  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => {
    unsubCustomUi()
  })

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
              <span
                class="link"
                onClick={() =>
                  userStore.saveUI({
                    bgCustom: '',
                    bgCustomGradient: '',
                    themeBg: UI.BG_THEME[0],
                  })
                }
              >
                Reset to Default
              </span>
            </>
          }
        />
        <div class="flex items-center gap-2">
          <Select
            fieldName="themeBg"
            items={themeBgOptions}
            value={state.ui.themeBg}
            onChange={(item) =>
              userStore.saveUI({ themeBg: item.value as any, bgCustom: undefined })
            }
          />
          <ColorPicker
            fieldName="customBg"
            onChange={(color) => userStore.saveCustomUI({ bgCustom: color })}
            onInput={(color) => tryCustomUI({ bgCustom: color })}
            value={state.current.bgCustom || state.ui.bgCustom}
          />
        </div>
      </div>

      <FileInput fieldName="background" label="Background Image" onUpdate={onBackground} />
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
      <h3 class="text-md font-bold">Chat View Settings</h3>

      <Toggle
        label="Trim Incomplete Sentences"
        fieldName="trimSentences"
        value={state.ui.trimSentences ?? false}
        onChange={(next) => userStore.saveUI({ trimSentences: next })}
      />

      <Select
        fieldName="chatMode"
        label="View Mode"
        helperText={
          <>
            <b>Standard</b>: Messages take up the entire chat screen.
            <br />
            <b>Split</b>: Character's avatar appears at the top of the screen
          </>
        }
        items={[
          { label: 'Standard', value: 'standard' },
          { label: 'Split', value: 'split' },
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
          <span class="link" onClick={() => userStore.updateColor({ msgBackground: 'bg-800' })}>
            Reset to Default
          </span>
        }
        onChange={(color) => userStore.updateColor({ msgBackground: color })}
        value={state.current.msgBackground}
      />

      <ColorPicker
        label="Bot Message Background Color"
        fieldName="botMessageColor"
        helperText={
          <>
            <span class="link" onClick={() => userStore.updateColor({ botBackground: 'bg-800' })}>
              Reset to Default
            </span>
            <span>
              . This will override the <b>Message Background</b>.{' '}
            </span>
          </>
        }
        onChange={(color) => userStore.updateColor({ botBackground: color })}
        value={state.current.botBackground}
      />

      <ColorPicker
        label="Chat Text Color"
        fieldName="chatTextColor"
        helperText={
          <span class="link" onClick={() => userStore.updateColor({ chatTextColor: 'text-800' })}>
            Reset to Default
          </span>
        }
        onChange={(color) => userStore.updateColor({ chatTextColor: color })}
        value={state.current.chatTextColor}
      />

      <ColorPicker
        label="Chat Emphasis Color"
        fieldName="chatEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.updateColor({ chatEmphasisColor: 'text-600' })}
          >
            Reset to Default
          </span>
        }
        onChange={(color) => userStore.updateColor({ chatEmphasisColor: color })}
        value={state.current.chatEmphasisColor}
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
      <Divider />
      <div class="text-lg font-bold">Chat Styling</div>

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
      <Toggle
        fieldName="logPromptsToBrowserConsole"
        label="Log prompts to browser console"
        value={state.ui?.logPromptsToBrowserConsole ?? false}
        onChange={(enabled) => userStore.saveUI({ logPromptsToBrowserConsole: enabled })}
      />
      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <Show when={ctx.chatBots.length > 0}>
        <div class="bg-100 flex w-full flex-col gap-2 rounded-md p-2">
          <Message
            editing={false}
            msg={toBotMsg(ctx.chatBots[0], '*I wave excitedly* Hello world!\nHow are you today?', {
              _id: '1',
            })}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
          />

          <Show when={state.profile}>
            <Message
              editing={false}
              msg={toUserMsg(
                state.profile!,
                '*I wave back* Hi {{char}}!\nFancy meeting you here!',
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
