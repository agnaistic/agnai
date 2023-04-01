import { Component, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsBuffer } from '../../shared/FileInput'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { AVATAR_CORNERS, AVATAR_SIZES, UI_INPUT_TYPE, UI_THEME, userStore } from '../../store'

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
      </div>

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

      <Select
        fieldName="chatInputType"
        label="Input Type"
        helperText={
          <>
            <p>Whether to use a single or multi-line input field.</p>
            <p>
              To create new lines MULTI-mode, use <code>Shift + Enter</code>.
            </p>
          </>
        }
        items={toDropdownItems(UI_INPUT_TYPE)}
        value={state.ui.input}
        onChange={(item) => userStore.updateUI({ input: item.value as any })}
      />

      <FileInput fieldName="background" label="Background Image" onUpdate={onBackground} />
      <div class="my-2 w-full justify-center">
        <Button onClick={() => userStore.setBackground(null)}>Remove Background</Button>
      </div>
    </>
  )
}

export default UISettings
