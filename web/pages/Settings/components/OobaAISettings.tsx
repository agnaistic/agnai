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
        placeholder="E.g. https://random-cloudflare-generated-words.trycloudflare.com"
        value={state.user?.oobaUrl}
      />
    </>
  )
}

export default OobaAISettings
