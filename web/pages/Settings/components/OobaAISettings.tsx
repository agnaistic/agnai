import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const OobaAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oobaUrl"
        label="Text-Generation-WebUI Compatible URL"
        helperText="Fully qualified URL. This URL must be publicly accessible."
        placeholder="E.g. https://8f41b512420d87f523.gradio.live"
        value={state.user?.oobaUrl}
      />
    </>
  )
}

export default OobaAISettings
