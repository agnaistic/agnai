import { Component, Show } from 'solid-js'
import { toChar, toBotMsg, toChat, toUserMsg } from '../../../common/dummy'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { AVATAR_CORNERS, AVATAR_SIZES, BG_THEME, UI_THEME, userStore } from '../../store'
import Message from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'
import ColorPicker from '/web/shared/ColorPicker'
import { FormLabel } from '/web/shared/FormLabel'

const themeOptions = UI_THEME.map((color) => ({ label: color, value: color }))
const themeBgOptions = [{ label: 'Custom', value: '' }].concat(
  ...BG_THEME.map((color) => ({ label: color, value: color }))
)

function noop() {}

const bot = toChar('Robot')
const chat = toChat(bot, { _id: '1', name: 'Example Chat' })

const UISettings: Component = () => {
  const state = userStore()

  const onBackground = async (results: FileInputResult[]) => {
    if (!results.length) return
    const [result] = results

    userStore.setBackground(result)
  }

  return (
    <>
      <h3 class="text-lg font-bold">Theme</h3>
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="theme"
          items={themeOptions}
          label="Color"
          value={state.ui.theme}
          onChange={(item) => userStore.updateUI({ theme: item.value as any })}
        />

        <Select
          fieldName="mode"
          label="Mode"
          items={[
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
          ]}
          value={state.ui.mode}
          onChange={(item) => userStore.updateUI({ mode: item.value as any })}
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
                  userStore.updateUI({ bgCustom: '', bgCustomGradient: '', themeBg: BG_THEME[0] })
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
              userStore.updateUI({ themeBg: item.value as any, bgCustom: undefined })
            }
          />
          <ColorPicker
            fieldName="customBg"
            onChange={(color) => userStore.updateUI({ bgCustom: color, themeBg: undefined })}
            value={state.ui.bgCustom}
          />
          {/* <ColorPicker
          fieldName="customBgGradient"
          onChange={(color) => userStore.updateUI({ bgCustomGradient: color })}
          value={state.ui.bgCustomGradient}
        /> */}
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
        onChange={(item) => userStore.updateUI({ font: item.value as any })}
      />

      <h4 class="text-md font-bold">Chat Avatars</h4>
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="avatarSize"
          label="Size"
          items={toDropdownItems(AVATAR_SIZES)}
          value={state.ui.avatarSize}
          onChange={(item) => userStore.updateUI({ avatarSize: item.value as any })}
        />
        <Select
          fieldName="avatarCorners"
          label="Corner Radius"
          items={toDropdownItems(AVATAR_CORNERS)}
          value={state.ui.avatarCorners}
          onChange={(item) => userStore.updateUI({ avatarCorners: item.value as any })}
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

      <FileInput fieldName="background" label="Background Image" onUpdate={onBackground} />
      <div class="my-2 w-full justify-center">
        <Button onClick={() => userStore.setBackground(null)}>Remove Background</Button>
      </div>
      <Divider />
      <div class="text-lg font-bold">Chat Styling</div>

      <Select
        fieldName="chatWidth"
        label="Chat Width"
        items={[
          { label: 'Full Width', value: 'full' },
          { label: 'Narrow', value: 'narrow' },
        ]}
        onChange={(item) => userStore.updateUI({ chatWidth: item.value as any })}
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
        onChange={(value) => userStore.updateUI({ msgOpacity: value })}
      />

      <Toggle
        fieldName="imageWrap"
        label="Avatar Wrap Around"
        helperText='Allow text in messages to "wrap around" avatars'
        onChange={(value) => userStore.updateUI({ imageWrap: value })}
        value={state.ui.imageWrap}
      />
      <Divider />
      <Toggle
        fieldName="logPromptsToBrowserConsole"
        label="Log prompts to browser console"
        value={state.ui?.logPromptsToBrowserConsole ?? false}
        onChange={(enabled) => userStore.updateUI({ logPromptsToBrowserConsole: enabled })}
      />
      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <div class="bg-100 flex w-full flex-col gap-2 rounded-md p-2">
        <Message
          botMap={{}}
          char={bot}
          chat={chat}
          editing={false}
          msg={toBotMsg(bot, '*I wave excitedly* Hello world!\nHow are you today?', { _id: '1' })}
          onRemove={noop}
          sendMessage={() => {}}
          isPaneOpen={false}
        />

        <Show when={state.profile}>
          <Message
            botMap={{}}
            char={bot}
            chat={chat}
            editing={false}
            msg={toUserMsg(state.profile!, '*I wave back* Hi {{char}}!\nFancy meeting you here!', {
              _id: '2',
            })}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
          />
        </Show>
      </div>
    </>
  )
}

export default UISettings
