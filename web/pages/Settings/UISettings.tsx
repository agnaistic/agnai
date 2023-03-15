import { Component } from 'solid-js'
import Dropdown from '../../shared/Dropdown'
import { toDropdownItems } from '../../shared/util'
import { AVATAR_CORNERS, AVATAR_SIZES, UI_THEME, userStore } from '../../store'

const themeOptions = UI_THEME.map((color) => ({ label: color, value: color }))

const UISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <h3 class="text-lg font-bold">Theme</h3>
      <div class="flex flex-row justify-start gap-4">
        <Dropdown
          fieldName="theme"
          items={themeOptions}
          label="Color"
          value={state.ui.theme}
          onChange={(item) => userStore.updateUI({ theme: item.value as any })}
        />

        <Dropdown
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

      <h4 class="text-md font-bold">Chat Avatars</h4>
      <div class="flex flex-row justify-start gap-4">
        <Dropdown
          fieldName="avatarSize"
          label="Size"
          items={toDropdownItems(AVATAR_SIZES)}
          value={state.ui.avatarSize}
          onChange={(item) => userStore.updateUI({ avatarSize: item.value as any })}
        />
        <Dropdown
          fieldName="avatarCorners"
          label="Corner Radius"
          items={toDropdownItems(AVATAR_CORNERS)}
          value={state.ui.avatarCorners}
          onChange={(item) => userStore.updateUI({ avatarCorners: item.value as any })}
        />
      </div>
    </>
  )
}

export default UISettings
