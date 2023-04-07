import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const LuminAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="luminaiUrl"
        label="LuminAI URL"
        helperText="Fully qualified URL. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.luminaiUrl}
      />
    </>
  )
}

export default LuminAISettings
