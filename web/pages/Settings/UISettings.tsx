import { Component, Show } from 'solid-js'
import { toChar, toBotMsg, toChat, toUserMsg } from '../../../common/dummy'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { AVATAR_CORNERS, AVATAR_SIZES, UI_THEME, userStore } from '../../store'
import Message from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'

const themeOptions = UI_THEME.map((color) => ({ label: color, value: color }))

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
      <Divider />
      <Toggle
        fieldName="logPromptsToBrowserConsole"
        label="Log prompts to browser console"
        value={state.ui?.logPromptsToBrowserConsole ?? false}
        onChange={(enabled) => userStore.updateUI({ logPromptsToBrowserConsole: enabled })}
      />
      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <div class="flex w-full flex-col gap-2 rounded-md bg-[var(--bg-100)] p-2">
        <Message
          char={bot}
          chat={chat}
          editing={false}
          msg={toBotMsg(bot, '*I wave excitedly* Hello world!\nHow are you today?', { _id: '1' })}
          onRemove={noop}
        />

        <Show when={state.profile}>
          <Message
            char={bot}
            chat={chat}
            editing={false}
            msg={toUserMsg(state.profile!, '*I wave back* Hi {{char}}!\nFancy meeting you here!', {
              _id: '2',
            })}
            onRemove={noop}
          />
        </Show>
      </div>
    </>
  )
}

export default UISettings

function noop() {}

const bot = toChar('Robot')
const chat = toChat(bot, { _id: '1', name: 'Example Chat' })
